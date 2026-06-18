'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { TipoComunicado } from '@prisma/client';

export async function getComunicados() {
  const now = new Date();
  return await prisma.comunicado.findMany({
    where: {
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
    orderBy: [
      { destaque: 'desc' },
      { createdAt: 'desc' },
    ],
  });
}

export async function getComunicadoById(id: string) {
  return await prisma.comunicado.findUnique({ where: { id } });
}

export async function criarComunicado(formData: FormData) {
  const titulo = formData.get('titulo') as string;
  const conteudo = formData.get('conteudo') as string;
  const tipo = formData.get('tipo') as TipoComunicado;
  const destaque = formData.get('destaque') === 'on';
  const expiresAtRaw = formData.get('expiresAt') as string;

  if (!titulo || !conteudo) {
    throw new Error('Título e conteúdo são obrigatórios.');
  }

  await prisma.comunicado.create({
    data: {
      titulo,
      conteudo,
      tipo: tipo || 'AVISO',
      destaque,
      expiresAt: expiresAtRaw ? new Date(expiresAtRaw) : null,
    },
  });

  revalidatePath('/');
  revalidatePath('/admin/comunicados');
  redirect('/admin/comunicados');
}

export async function deletarComunicado(id: string) {
  await prisma.comunicado.delete({ where: { id } });
  revalidatePath('/');
  revalidatePath('/admin/comunicados');
}
