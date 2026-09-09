'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { isAdmin } from './admin';
import { CHAVE_EXPEDIENTE_VALE_DE } from '@/lib/expediente';

/**
 * Monta o expediente para o cálculo de conformidade.
 *
 * Uma consulta só, reaproveitada pelas telas que calculam vários setores de uma
 * vez (relatório geral, fechamento do prêmio) — daí `diasSemExpediente` vir
 * separado, para não repetir a mesma busca oito vezes.
 */
export async function getDiasSemExpediente(): Promise<Set<string>> {
  const dias = await prisma.diaSemExpediente.findMany({ select: { data: true } });
  return new Set(dias.map((d) => new Date(d.data).toISOString().slice(0, 10)));
}

/** Data → motivo ("Independência", "falta de energia"), para as telas explicarem. */
export async function getMotivosSemExpediente(): Promise<Record<string, string>> {
  const dias = await prisma.diaSemExpediente.findMany({ select: { data: true, descricao: true } });
  return Object.fromEntries(
    dias.map((d) => [new Date(d.data).toISOString().slice(0, 10), d.descricao]),
  );
}

/** Mês (YYYY-MM) a partir do qual a regra de expediente passa a valer. */
export async function getExpedienteValeDe(): Promise<string | null> {
  const cfg = await prisma.config.findUnique({ where: { chave: CHAVE_EXPEDIENTE_VALE_DE } });
  return cfg?.valor || null;
}

export async function definirExpedienteValeDe(valor: string | null) {
  if (!(await isAdmin())) throw new Error('Apenas o administrador pode mudar isso.');

  if (valor && !/^\d{4}-\d{2}$/.test(valor)) {
    throw new Error('Informe o mês no formato AAAA-MM.');
  }

  if (valor) {
    await prisma.config.upsert({
      where: { chave: CHAVE_EXPEDIENTE_VALE_DE },
      create: { chave: CHAVE_EXPEDIENTE_VALE_DE, valor },
      update: { valor },
    });
  } else {
    await prisma.config.deleteMany({ where: { chave: CHAVE_EXPEDIENTE_VALE_DE } });
  }

  revalidatePath('/', 'layout');
}

/** Tudo que o cálculo precisa saber sobre expediente, numa ida só ao banco. */
export async function carregarContextoExpediente() {
  const [motivos, valeAPartirDe] = await Promise.all([
    getMotivosSemExpediente(),
    getExpedienteValeDe(),
  ]);
  return { semExpediente: new Set(Object.keys(motivos)), motivos, valeAPartirDe };
}

// ─── DIAS SEM EXPEDIENTE (feriados e fechamentos) ───

export async function getDiasSemExpedienteDetalhado(deAno?: number) {
  const where = deAno
    ? { data: { gte: new Date(Date.UTC(deAno, 0, 1)), lt: new Date(Date.UTC(deAno + 2, 0, 1)) } }
    : {};
  return prisma.diaSemExpediente.findMany({ where, orderBy: { data: 'asc' } });
}

export async function adicionarDiaSemExpediente(dataISO: string, descricao: string) {
  if (!(await isAdmin())) throw new Error('Apenas o administrador pode mexer nisso.');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataISO)) throw new Error('Data inválida.');
  const texto = descricao.trim();
  if (!texto) throw new Error('Diga o que foi esse dia (ex.: Natal, feriado municipal).');

  const [ano, mes, dia] = dataISO.split('-').map(Number);
  await prisma.diaSemExpediente.upsert({
    where: { data: new Date(Date.UTC(ano, mes - 1, dia)) },
    create: { data: new Date(Date.UTC(ano, mes - 1, dia)), descricao: texto },
    update: { descricao: texto },
  });

  revalidatePath('/', 'layout');
}

export async function removerDiaSemExpediente(id: string) {
  if (!(await isAdmin())) throw new Error('Apenas o administrador pode mexer nisso.');
  await prisma.diaSemExpediente.delete({ where: { id } });
  revalidatePath('/', 'layout');
}

/**
 * Cadastra de uma vez os feriados nacionais que ainda não estão na lista.
 *
 * Só nacionais: municipal fica de fora de propósito, porque às vezes o Correios
 * central pede para abrir — esse a gestora acrescenta quando de fato fechar.
 */
export async function semearFeriadosNacionais(anos: number[]) {
  if (!(await isAdmin())) throw new Error('Apenas o administrador pode mexer nisso.');

  const { feriadosNacionais } = await import('@/lib/expediente');
  let criados = 0;

  for (const ano of anos) {
    for (const f of feriadosNacionais(ano)) {
      const [a, m, d] = f.data.split('-').map(Number);
      const data = new Date(Date.UTC(a, m - 1, d));
      const existe = await prisma.diaSemExpediente.findUnique({ where: { data } });
      if (existe) continue;
      await prisma.diaSemExpediente.create({ data: { data, descricao: f.nome } });
      criados++;
    }
  }

  revalidatePath('/', 'layout');
  return { criados };
}
