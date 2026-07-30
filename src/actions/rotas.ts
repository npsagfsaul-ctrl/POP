'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getRotas(apenasAtivas = false) {
  return prisma.rota.findMany({
    where: apenasAtivas ? { ativo: true } : undefined,
    orderBy: { nome: 'asc' },
  });
}

export async function criarRota(formData: FormData) {
  const nome = (formData.get('nome') as string)?.trim();
  if (!nome) throw new Error('Nome da rota é obrigatório.');

  await prisma.rota.create({ data: { nome } });
  revalidatePath('/coletas/cadastros');
  revalidatePath('/coletas');
}

export async function atualizarRota(id: string, formData: FormData) {
  const nome = (formData.get('nome') as string)?.trim();
  if (!nome) throw new Error('Nome da rota é obrigatório.');

  await prisma.rota.update({ where: { id }, data: { nome } });
  revalidatePath('/coletas/cadastros');
  revalidatePath('/coletas');
}

export async function alternarRotaAtivo(id: string, ativo: boolean) {
  await prisma.rota.update({ where: { id }, data: { ativo } });
  revalidatePath('/coletas/cadastros');
  revalidatePath('/coletas');
}

export async function deletarRota(id: string) {
  // Rotas fixas vinculadas apenas perdem o vínculo (rotaId vira null).
  await prisma.rota.delete({ where: { id } });
  revalidatePath('/coletas/cadastros');
  revalidatePath('/coletas');
}
