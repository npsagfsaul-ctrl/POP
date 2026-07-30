'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getColetores(apenasAtivos = false) {
  return prisma.coletor.findMany({
    where: apenasAtivos ? { ativo: true } : undefined,
    orderBy: { nome: 'asc' },
  });
}

export async function criarColetor(formData: FormData) {
  const nome = (formData.get('nome') as string)?.trim();
  const cor = (formData.get('cor') as string) || '#3b82f6';
  if (!nome) throw new Error('Nome do coletor é obrigatório.');

  await prisma.coletor.create({ data: { nome, cor } });
  revalidatePath('/coletas/cadastros');
  revalidatePath('/coletas');
}

export async function atualizarColetor(id: string, formData: FormData) {
  const nome = (formData.get('nome') as string)?.trim();
  const cor = (formData.get('cor') as string) || '#3b82f6';
  if (!nome) throw new Error('Nome do coletor é obrigatório.');

  await prisma.coletor.update({ where: { id }, data: { nome, cor } });
  revalidatePath('/coletas/cadastros');
  revalidatePath('/coletas');
}

export async function alternarColetorAtivo(id: string, ativo: boolean) {
  await prisma.coletor.update({ where: { id }, data: { ativo } });
  revalidatePath('/coletas/cadastros');
  revalidatePath('/coletas');
}

export async function deletarColetor(id: string) {
  try {
    await prisma.coletor.delete({ where: { id } });
  } catch {
    throw new Error('Não dá para excluir: este coletor já tem coletas ou rotas fixas registradas. Use "Desativar".');
  }
  revalidatePath('/coletas/cadastros');
}
