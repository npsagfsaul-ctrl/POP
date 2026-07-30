'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { PeriodoColeta, TipoColeta, StatusColeta } from '@prisma/client';

function parseData(dataString: string) {
  const data = new Date(dataString);
  data.setUTCHours(0, 0, 0, 0);
  return data;
}

/**
 * Garante que as coletas das rotas fixas ativas existam para a data informada.
 * Semeia UMA única vez por dia: se já existe qualquer coleta vinda de rota fixa
 * nessa data, não semeia de novo — assim uma exclusão feita pela atendente não
 * "volta" no próximo carregamento da página.
 * Não fabrica histórico: datas mais de 1 dia no passado não são semeadas.
 */
async function garantirColetasFixas(dataString: string) {
  const limite = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (dataString < limite) return;

  const diaSemana = new Date(`${dataString}T00:00:00`).getDay();
  const data = parseData(dataString);

  const jaSemeada = await prisma.coleta.findFirst({
    where: { data, rotaFixaId: { not: null } },
    select: { id: true },
  });
  if (jaSemeada) return;

  const fixas = await prisma.rotaFixa.findMany({ where: { ativo: true } });
  const aplicaveis = fixas.filter(
    (f) => Array.isArray(f.dias) && (f.dias as number[]).includes(diaSemana),
  );
  if (aplicaveis.length === 0) return;

  await prisma.coleta.createMany({
    data: aplicaveis.map((f) => ({
      data,
      periodo: f.periodo,
      tipo: 'FIXA' as TipoColeta,
      observacao: f.observacao,
      coletorId: f.coletorId,
      clienteId: f.clienteId,
      rotaFixaId: f.id,
    })),
  });
}

export async function getColetasPorData(dataString: string) {
  await garantirColetasFixas(dataString);

  const data = parseData(dataString);
  return prisma.coleta.findMany({
    where: { data },
    include: { coletor: true, cliente: true, atendente: true, rotaFixa: { include: { rota: true } } },
    orderBy: [{ tipo: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function getColetasMensais(mes: number, ano: number) {
  const dataInicio = new Date(`${ano}-${String(mes).padStart(2, '0')}-01T00:00:00Z`);
  const proximoMes = mes === 12 ? 1 : mes + 1;
  const proximoAno = mes === 12 ? ano + 1 : ano;
  const dataFim = new Date(`${proximoAno}-${String(proximoMes).padStart(2, '0')}-01T00:00:00Z`);

  return prisma.coleta.findMany({
    where: { data: { gte: dataInicio, lt: dataFim } },
    include: { coletor: true, cliente: true, atendente: true, rotaFixa: { include: { rota: true } } },
    orderBy: [{ data: 'asc' }, { periodo: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function criarColeta(formData: FormData) {
  const dataString = formData.get('data') as string;
  const periodo = formData.get('periodo') as PeriodoColeta;
  const tipo = (formData.get('tipo') as TipoColeta) || 'EXTRA';
  const coletorId = formData.get('coletorId') as string;
  const clienteId = formData.get('clienteId') as string;
  const atendenteId = ((formData.get('atendenteId') as string) || '').trim() || null;
  const observacao = ((formData.get('observacao') as string) || '').trim() || null;
  const naoTeveColeta =
    formData.get('naoTeveColeta') === 'on' || formData.get('naoTeveColeta') === 'true';

  if (!dataString || !periodo || !coletorId || !clienteId) {
    throw new Error('Data, período, coletor e cliente são obrigatórios.');
  }

  await prisma.coleta.create({
    data: {
      data: parseData(dataString),
      periodo,
      tipo,
      coletorId,
      clienteId,
      atendenteId,
      observacao,
      naoTeveColeta,
    },
  });

  revalidatePath('/coletas');
}

export async function atualizarColeta(id: string, formData: FormData) {
  const periodo = formData.get('periodo') as PeriodoColeta;
  const tipo = (formData.get('tipo') as TipoColeta) || 'EXTRA';
  const coletorId = formData.get('coletorId') as string;
  const clienteId = formData.get('clienteId') as string;
  const atendenteId = ((formData.get('atendenteId') as string) || '').trim() || null;
  const observacao = ((formData.get('observacao') as string) || '').trim() || null;
  const naoTeveColeta =
    formData.get('naoTeveColeta') === 'on' || formData.get('naoTeveColeta') === 'true';

  if (!periodo || !coletorId || !clienteId) {
    throw new Error('Período, coletor e cliente são obrigatórios.');
  }

  await prisma.coleta.update({
    where: { id },
    data: { periodo, tipo, coletorId, clienteId, atendenteId, observacao, naoTeveColeta },
  });

  revalidatePath('/coletas');
}

export async function atualizarStatusColeta(id: string, status: StatusColeta) {
  await prisma.coleta.update({
    where: { id },
    data: {
      status,
      // hora registrada apenas quando marcada como coletada
      horaColeta: status === 'COLETADO' ? new Date() : null,
    },
  });
  revalidatePath('/coletas');
}

export async function deletarColeta(id: string) {
  await prisma.coleta.delete({ where: { id } });
  revalidatePath('/coletas');
}
