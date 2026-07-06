'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getAtendentes(apenasAtivos = false) {
  return prisma.atendente.findMany({
    where: apenasAtivos ? { ativo: true } : undefined,
    orderBy: { nome: 'asc' },
  });
}

export async function criarAtendente(formData: FormData) {
  const nome = (formData.get('nome') as string)?.trim();
  if (!nome) throw new Error('Nome do funcionário é obrigatório.');

  await prisma.atendente.create({ data: { nome } });
  revalidatePath('/coletas/cadastros');
  revalidatePath('/coletas');
  revalidatePath('/prospeccao/cadastros');
  revalidatePath('/prospeccao');
}

export async function atualizarAtendente(id: string, formData: FormData) {
  const nome = (formData.get('nome') as string)?.trim();
  if (!nome) throw new Error('Nome do funcionário é obrigatório.');

  await prisma.atendente.update({ where: { id }, data: { nome } });
  revalidatePath('/coletas/cadastros');
  revalidatePath('/coletas');
  revalidatePath('/prospeccao/cadastros');
  revalidatePath('/prospeccao');
}

export async function alternarAtendenteAtivo(id: string, ativo: boolean) {
  await prisma.atendente.update({ where: { id }, data: { ativo } });
  revalidatePath('/coletas/cadastros');
  revalidatePath('/coletas');
  revalidatePath('/prospeccao/cadastros');
  revalidatePath('/prospeccao');
}

export async function deletarAtendente(id: string) {
  try {
    await prisma.atendente.delete({ where: { id } });
  } catch {
    throw new Error('Não dá para excluir: este funcionário já tem coletas ou prospecções registradas. Use "Desativar".');
  }
  revalidatePath('/coletas/cadastros');
  revalidatePath('/prospeccao/cadastros');
  revalidatePath('/prospeccao');
}
