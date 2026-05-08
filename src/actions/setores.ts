'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { cookies } from 'next/headers';

export async function createSetor(formData: FormData) {
  const nome = formData.get('nome') as string;
  const senha = formData.get('senha') as string;

  if (!nome) {
    throw new Error('O nome do setor é obrigatório.');
  }

  await prisma.setor.create({
    data: {
      nome,
      senha: senha && senha.trim() !== '' ? senha : null,
    },
  });

  revalidatePath('/');
  redirect('/');
}

export async function updateSetor(id: string, formData: FormData) {
  const nome = formData.get('nome') as string;
  const senha = formData.get('senha') as string;

  if (!nome) {
    throw new Error('O nome do setor é obrigatório.');
  }

  await prisma.setor.update({
    where: { id },
    data: {
      nome,
      senha: senha && senha.trim() !== '' ? senha : null,
    },
  });

  revalidatePath('/');
  revalidatePath(`/setores/${id}`);
  redirect(`/setores/${id}`);
}

export async function verificarSenhaSetor(setorId: string, senhaTentativa: string) {
  const setor = await prisma.setor.findUnique({ where: { id: setorId } });
  
  if (!setor || !setor.senha) return { success: true };
  
  if (setor.senha === senhaTentativa) {
    const cookieStore = await cookies();
    cookieStore.set(`auth_setor_${setorId}`, 'true', {
      maxAge: 60 * 60 * 24 * 7, // 7 dias de acesso livre
      path: '/',
    });
    revalidatePath(`/setores/${setorId}`);
    return { success: true };
  }
  
  return { success: false, error: 'Senha incorreta' };
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

export async function getSetorById(id: string) {
  return await prisma.setor.findUnique({
    where: { id },
  });
}
