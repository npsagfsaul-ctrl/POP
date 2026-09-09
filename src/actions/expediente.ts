'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { isAdmin } from './admin';
import { CHAVE_EXPEDIENTE_VALE_DE, feriadosNacionaisNoIntervalo } from '@/lib/expediente';

/** Data → motivo, só dos dias que a gestora cadastrou (fora os nacionais). */
export async function getMotivosSemExpediente(): Promise<Record<string, string>> {
  const dias = await prisma.diaSemExpediente.findMany({ select: { data: true, descricao: true } });
  return Object.fromEntries(
    dias.map((d) => [new Date(d.data).toISOString().slice(0, 10), d.descricao]),
  );
}

/**
 * Mês em que a regra de expediente entrou: setembro/2026.
 *
 * Junho, julho e agosto foram fechados e pagos com a regra antiga (sábado
 * contando para todos, sem feriado) e não podem mudar de nota agora.
 *
 * Está no código, e não numa tela, porque é decisão de uma vez só: mudar
 * depois ou reescreveria o passado ou abriria um buraco no meio do histórico.
 * O valor gravado em Config continua tendo prioridade, mas o padrão sozinho já
 * mantém a regra funcionando — sem depender de uma linha de banco que não tem
 * mais onde ser criada.
 */
const MES_INICIAL_PADRAO = '2026-09';

export async function getExpedienteValeDe(): Promise<string | null> {
  const cfg = await prisma.config.findUnique({ where: { chave: CHAVE_EXPEDIENTE_VALE_DE } });
  return cfg?.valor || MES_INICIAL_PADRAO;
}

/** Tudo que o cálculo precisa saber sobre expediente, numa ida só ao banco. */
export async function carregarContextoExpediente() {
  const [cadastrados, valeAPartirDe] = await Promise.all([
    getMotivosSemExpediente(),
    getExpedienteValeDe(),
  ]);

  // Feriado nacional vem calculado, não do banco: é fato, não configuração.
  // A janela cobre o que as telas conseguem navegar (mês anterior e meses à
  // frente) sem precisar recalcular a cada consulta.
  const anoAtual = new Date().getUTCFullYear();
  const motivos = {
    ...feriadosNacionaisNoIntervalo(anoAtual - 1, anoAtual + 2),
    // O que a gestora cadastrou vem por cima: se ela deu outro nome a um dia,
    // é o nome dela que vale.
    ...cadastrados,
  };

  return { semExpediente: new Set(Object.keys(motivos)), motivos, valeAPartirDe };
}

// ─── DIAS EM QUE A AGÊNCIA NÃO ABRIU (fora os feriados nacionais) ───
//
// Só o que o sistema não tem como saber sozinho: feriado municipal em que a
// agência fechou (nem sempre fecha — às vezes o Correios central pede para
// abrir), falta de energia, alagamento.

export async function getDiasSemExpedienteDetalhado() {
  const dias = await prisma.diaSemExpediente.findMany({ orderBy: { data: 'desc' } });
  const nacionais = feriadosNacionaisNoIntervalo(
    new Date().getUTCFullYear() - 2,
    new Date().getUTCFullYear() + 2,
  );

  // Feriado nacional que tenha sobrado de quando a lista era cadastrada à mão
  // não aparece: o sistema já o conhece, e mostrar seria pedir manutenção de
  // uma coisa que se resolve sozinha.
  return dias
    .map((d) => ({
      id: d.id,
      data: new Date(d.data).toISOString().slice(0, 10),
      descricao: d.descricao,
    }))
    .filter((d) => !(d.data in nacionais));
}

export async function adicionarDiaSemExpediente(dataISO: string, descricao: string) {
  if (!(await isAdmin())) throw new Error('Apenas o administrador pode mexer nisso.');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataISO)) throw new Error('Data inválida.');
  const texto = descricao.trim();
  if (!texto) throw new Error('Diga o que foi esse dia (ex.: feriado municipal, falta de energia).');

  const [ano, mes, dia] = dataISO.split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));

  await prisma.diaSemExpediente.upsert({
    where: { data },
    create: { data, descricao: texto },
    update: { descricao: texto },
  });

  revalidatePath('/', 'layout');
}

export async function removerDiaSemExpediente(id: string) {
  if (!(await isAdmin())) throw new Error('Apenas o administrador pode mexer nisso.');
  await prisma.diaSemExpediente.delete({ where: { id } });
  revalidatePath('/', 'layout');
}
