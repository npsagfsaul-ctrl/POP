'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { isAdmin } from './admin';
import { parseHoras, saldoDe } from '@/lib/horas';
import { lerJornada, minutosDoPeriodo, resumoJornada, type Jornada, type Periodo } from '@/lib/jornada';

/**
 * Banco de horas é dado pessoal de colaborador: quem deve hora, quem faltou,
 * quem tem atestado. Fica com o Administrador, que é quem responde pelo
 * Departamento Pessoal. A checagem vive em cada ação, e não só na tela, porque
 * Server Action é endereço público.
 */
async function exigirAdmin() {
  if (!(await isAdmin())) {
    throw new Error('O controle de horas é do Departamento Pessoal. Entre como Administrador.');
  }
}

export async function getColaboradoresComSaldo() {
  await exigirAdmin();

  const colaboradores = await prisma.atendente.findMany({
    where: { ativo: true },
    include: {
      setor: { select: { nome: true } },
      lancamentosHoras: { select: { minutos: true } },
    },
    orderBy: { nome: 'asc' },
  });

  return colaboradores.map((c) => ({
    id: c.id,
    nome: c.nome,
    setorNome: c.setor?.nome ?? null,
    // Na lista basta a carga semanal ("44h · Seg a Sáb"); os horários ficam na
    // ficha. Sem jornada preenchida, mostra a observação, se houver.
    jornadaResumo: resumoJornada(lerJornada(c.jornadaDetalhe)) || (c.jornada ?? ''),
    saldoMinutos: saldoDe(c.saldoInicialMinutos, c.lancamentosHoras),
    lancamentos: c.lancamentosHoras.length,
  }));
}

export async function getColaboradorComHoras(id: string) {
  await exigirAdmin();

  const c = await prisma.atendente.findUnique({
    where: { id },
    include: {
      setor: { select: { nome: true } },
      // Mais recente primeiro: o que a pessoa acabou de lançar fica à vista.
      lancamentosHoras: { orderBy: [{ data: 'desc' }, { createdAt: 'desc' }] },
    },
  });
  if (!c) return null;

  return {
    id: c.id,
    nome: c.nome,
    setorNome: c.setor?.nome ?? null,
    jornadaNota: c.jornada,
    jornada: lerJornada(c.jornadaDetalhe) ?? { semana: [], sabado: [] },
    saldoInicialMinutos: c.saldoInicialMinutos,
    saldoInicialEm: c.saldoInicialEm,
    lancamentos: c.lancamentosHoras.map((l) => ({
      id: l.id,
      data: l.data,
      minutos: l.minutos,
      motivo: l.motivo,
    })),
    saldoMinutos: saldoDe(c.saldoInicialMinutos, c.lancamentosHoras),
  };
}

function revalidar(id: string) {
  revalidatePath('/horas');
  revalidatePath(`/horas/${id}`);
}

/** O saldo de onde a conta do Portal começa, copiado do relatório do ponto. */
export async function definirSaldoInicial(id: string, texto: string, dataISO: string) {
  await exigirAdmin();

  const minutos = parseHoras(texto);
  if (minutos === null) {
    throw new Error('Escreva o saldo como horas:minutos — por exemplo 03:47, ou -03:47 se forem horas devidas.');
  }

  await prisma.atendente.update({
    where: { id },
    data: { saldoInicialMinutos: minutos, saldoInicialEm: dataISO.trim() || null },
  });
  revalidar(id);
}

/**
 * A jornada contratada: os horários em dois blocos mais uma observação curta.
 *
 * Guarda só períodos completos e bem formados. Meio período digitado some em
 * vez de ser gravado pela metade — na tela ele reaparece em branco, que é mais
 * honesto do que mostrar um horário que não vale.
 */
export async function definirJornada(id: string, jornada: Jornada, nota: string) {
  await exigirAdmin();

  const limpar = (ps: Periodo[]) =>
    (ps ?? [])
      .map((p) => ({ entrada: (p.entrada ?? '').trim(), saida: (p.saida ?? '').trim() }))
      .filter((p) => minutosDoPeriodo(p) !== null);

  const detalhe = { semana: limpar(jornada?.semana ?? []), sabado: limpar(jornada?.sabado ?? []) };
  const vazia = detalhe.semana.length === 0 && detalhe.sabado.length === 0;

  await prisma.atendente.update({
    where: { id },
    data: {
      jornada: nota.trim() || null,
      jornadaDetalhe: vazia ? Prisma.DbNull : detalhe,
    },
  });
  revalidar(id);
}

/**
 * Os saldos de todo mundo de uma vez, no fechamento.
 *
 * É assim que o trabalho realmente acontece: uma vez por mês, com o relatório
 * do ponto aberto do lado, digitando de cima para baixo. Abrir e fechar a
 * ficha de vinte pessoas para trocar um número cada era o atrito que sobrava.
 *
 * Ou grava tudo ou não grava nada: com um valor mal escrito no meio, gravar
 * os outros deixaria o fechamento pela metade sem ninguém perceber qual faltou.
 */
export async function salvarSaldosEmLote(
  dataISO: string,
  entradas: { id: string; nome: string; texto: string }[],
) {
  await exigirAdmin();

  const invalidos: string[] = [];
  const validos: { id: string; minutos: number }[] = [];

  for (const e of entradas) {
    const texto = (e.texto ?? '').trim();
    if (!texto) continue; // em branco = não mexe neste colaborador
    const minutos = parseHoras(texto);
    if (minutos === null) invalidos.push(e.nome);
    else validos.push({ id: e.id, minutos });
  }

  if (invalidos.length > 0) {
    throw new Error(
      `Saldo mal escrito em: ${invalidos.join(', ')}. Use horas:minutos, como -03:14.`,
    );
  }
  if (validos.length === 0) {
    throw new Error('Nenhum saldo preenchido.');
  }

  const data = dataISO.trim() || null;
  await prisma.$transaction(
    validos.map((v) =>
      prisma.atendente.update({
        where: { id: v.id },
        data: { saldoInicialMinutos: v.minutos, saldoInicialEm: data },
      }),
    ),
  );

  revalidatePath('/horas');
  return validos.length;
}

export async function criarLancamentoHoras(atendenteId: string, formData: FormData) {
  await exigirAdmin();

  const data = ((formData.get('data') as string) || '').trim();
  const tempo = ((formData.get('tempo') as string) || '').trim();
  const sinal = (formData.get('sinal') as string) === 'menos' ? -1 : 1;
  const motivo = ((formData.get('motivo') as string) || '').trim() || null;

  if (!data) throw new Error('Escolha a data do lançamento.');

  const minutos = parseHoras(tempo);
  if (minutos === null) {
    throw new Error('Escreva as horas como horas:minutos — por exemplo 01:30.');
  }
  if (minutos === 0) {
    throw new Error('O lançamento está zerado — não há o que registrar.');
  }

  // O sinal vem do seletor, então o campo de tempo guarda só a quantidade.
  // Digitar "-01:30" e ainda marcar "a menos" não vira +01:30.
  await prisma.lancamentoHoras.create({
    data: { atendenteId, data, minutos: Math.abs(minutos) * sinal, motivo },
  });
  revalidar(atendenteId);
}

export async function deletarLancamentoHoras(id: string, atendenteId: string) {
  await exigirAdmin();
  await prisma.lancamentoHoras.delete({ where: { id } });
  revalidar(atendenteId);
}
