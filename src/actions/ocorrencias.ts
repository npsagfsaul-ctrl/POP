'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Gravidade } from '@prisma/client';

export async function getOcorrencias() {
  return await prisma.ocorrencia.findMany({
    include: { setor: { select: { nome: true } } },
    orderBy: [
      { status: 'asc' },    // ABERTA primeiro
      { gravidade: 'desc' }, // CRITICA primeiro
      { createdAt: 'desc' },
    ],
  });
}

export async function getOcorrenciasBySetor(setorId: string) {
  return await prisma.ocorrencia.findMany({
    where: { setorId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function contarOcorrenciasAbertas() {
  return await prisma.ocorrencia.count({
    where: { status: 'ABERTA' },
  });
}

export async function criarOcorrencia(formData: FormData) {
  const descricao = formData.get('descricao') as string;
  const gravidade = formData.get('gravidade') as Gravidade;
  const setorId = formData.get('setorId') as string;

  if (!descricao || !setorId) {
    throw new Error('Descrição e setor são obrigatórios.');
  }

  await prisma.ocorrencia.create({
    data: {
      descricao,
      gravidade: gravidade || 'MEDIA',
      setorId,
    },
  });

  revalidatePath(`/setores/${setorId}`);
  revalidatePath('/admin/ocorrencias');
}

export async function resolverOcorrencia(id: string, resolucao: string, setorId: string) {
  await prisma.ocorrencia.update({
    where: { id },
    data: {
      status: 'RESOLVIDA',
      resolucao,
    },
  });

  revalidatePath('/admin/ocorrencias');
  revalidatePath(`/setores/${setorId}`);
}

export async function deletarOcorrencia(id: string) {
  await prisma.ocorrencia.delete({ where: { id } });
  revalidatePath('/admin/ocorrencias');
}
