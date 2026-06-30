'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { PeriodoColeta, TipoColeta } from '@prisma/client';

function parseData(dataString: string) {
  const data = new Date(dataString);
  data.setUTCHours(0, 0, 0, 0);
  return data;
}

export async function getColetasPorData(dataString: string) {
  const data = parseData(dataString);
  return prisma.coleta.findMany({
    where: { data },
    include: { coletor: true, cliente: true, atendente: true },
    orderBy: [{ tipo: 'asc' }, { createdAt: 'asc' }],
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

  revalidatePath('/admin/coletas');
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

  revalidatePath('/admin/coletas');
}

export async function deletarColeta(id: string) {
  await prisma.coleta.delete({ where: { id } });
  revalidatePath('/admin/coletas');
}
