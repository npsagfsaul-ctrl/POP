'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function getLembretes() {
  return await prisma.lembrete.findMany({
    orderBy: { data: 'asc' },
  });
}

export async function getLembretesProximos(dias = 30) {
  const hoje = new Date();
  hoje.setUTCHours(0, 0, 0, 0);
  const limite = new Date(hoje);
  limite.setDate(limite.getDate() + dias);

  return await prisma.lembrete.findMany({
    where: {
      data: {
        gte: hoje,
        lte: limite,
      },
    },
    orderBy: { data: 'asc' },
  });
}

export async function criarLembrete(formData: FormData) {
  const titulo = formData.get('titulo') as string;
  const dataRaw = formData.get('data') as string;
  const descricao = formData.get('descricao') as string;

  if (!titulo || !dataRaw) {
    throw new Error('Título e data são obrigatórios.');
  }

  const data = new Date(dataRaw);
  data.setUTCHours(0, 0, 0, 0);

  await prisma.lembrete.create({
    data: {
      titulo,
      data,
      descricao: descricao || null,
    },
  });

  revalidatePath('/');
  revalidatePath('/admin/lembretes');
  redirect('/admin/lembretes');
}

export async function deletarLembrete(id: string) {
  await prisma.lembrete.delete({ where: { id } });
  revalidatePath('/');
  revalidatePath('/admin/lembretes');
}
