'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createSetor(formData: FormData) {
  const nome = formData.get('nome') as string;

  if (!nome) {
    throw new Error('O nome do setor é obrigatório.');
  }

  await prisma.setor.create({
    data: {
      nome,
    },
  });

  revalidatePath('/');
  redirect('/');
}

export async function getSetores() {
  return await prisma.setor.findMany({
    orderBy: {
      nome: 'asc',
    },
    include: {
      _count: {
        select: { pops: true },
      },
    },
  });
}
