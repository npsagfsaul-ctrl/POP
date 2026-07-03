'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { normalizarQuebrasDeLinha } from '@/lib/texto';

export async function createPop(formData: FormData) {
  const titulo = formData.get('titulo') as string;
  const setorId = formData.get('setorId') as string;
  const orientacaoAvaliacao = formData.get('orientacaoAvaliacao') as string;
  const instrucaoTrabalho = formData.get('instrucaoTrabalho') as string;
  const peso = Number(formData.get('peso') || 1);

  if (!titulo || !setorId || !orientacaoAvaliacao || !instrucaoTrabalho) {
    throw new Error('Todos os campos são obrigatórios.');
  }

  await prisma.pop.create({
    data: {
      titulo: normalizarQuebrasDeLinha(titulo),
      setorId,
      orientacaoAvaliacao: normalizarQuebrasDeLinha(orientacaoAvaliacao),
      instrucaoTrabalho: normalizarQuebrasDeLinha(instrucaoTrabalho),
      peso,
    },
  });

  revalidatePath(`/setores/${setorId}`);
  redirect(`/setores/${setorId}`);
}

export async function updatePop(id: string, formData: FormData) {
  const titulo = formData.get('titulo') as string;
  const setorId = formData.get('setorId') as string;
  const orientacaoAvaliacao = formData.get('orientacaoAvaliacao') as string;
  const instrucaoTrabalho = formData.get('instrucaoTrabalho') as string;
  const peso = Number(formData.get('peso') || 1);

  if (!titulo || !setorId || !orientacaoAvaliacao || !instrucaoTrabalho) {
    throw new Error('Todos os campos são obrigatórios.');
  }

  await prisma.pop.update({
    where: { id },
    data: {
      titulo: normalizarQuebrasDeLinha(titulo),
      setorId,
      orientacaoAvaliacao: normalizarQuebrasDeLinha(orientacaoAvaliacao),
      instrucaoTrabalho: normalizarQuebrasDeLinha(instrucaoTrabalho),
      peso,
    },
  });

  revalidatePath(`/setores/${setorId}`);
  redirect(`/setores/${setorId}`);
}

export async function deletePop(id: string, setorId: string) {
  await prisma.pop.delete({
    where: { id },
  });

  revalidatePath(`/setores/${setorId}`);
}

export async function getPopsBySetor(setorId: string) {
  return await prisma.pop.findMany({
    where: { setorId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getPopById(id: string) {
  return await prisma.pop.findUnique({
    where: { id },
    include: { setor: true }
  });
}
