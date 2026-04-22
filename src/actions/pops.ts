'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createPop(formData: FormData) {
  const titulo = formData.get('titulo') as string;
  const setorId = formData.get('setorId') as string;
  const orientacaoAvaliacao = formData.get('orientacaoAvaliacao') as string;
  const instrucaoTrabalho = formData.get('instrucaoTrabalho') as string;

  if (!titulo || !setorId || !orientacaoAvaliacao || !instrucaoTrabalho) {
    throw new Error('Todos os campos são obrigatórios.');
  }

  await prisma.pop.create({
    data: {
      titulo,
      setorId,
      orientacaoAvaliacao,
      instrucaoTrabalho,
    },
  });

  revalidatePath(`/setores/${setorId}`);
  redirect(`/setores/${setorId}`);
}

export async function getPopsBySetor(setorId: string) {
  return await prisma.pop.findMany({
    where: { setorId },
    orderBy: { createdAt: 'desc' },
  });
}
