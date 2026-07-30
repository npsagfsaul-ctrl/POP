'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getClientes(apenasAtivos = false) {
  return prisma.cliente.findMany({
    where: apenasAtivos ? { ativo: true } : undefined,
    orderBy: { nome: 'asc' },
  });
}

export async function criarCliente(formData: FormData) {
  const nome = (formData.get('nome') as string)?.trim();
  const codigo = ((formData.get('codigo') as string) || '').trim() || null;
  if (!nome) throw new Error('Nome do cliente é obrigatório.');

  await prisma.cliente.create({ data: { nome, codigo } });
  revalidatePath('/coletas/cadastros');
  revalidatePath('/coletas');
}

export async function atualizarCliente(id: string, formData: FormData) {
  const nome = (formData.get('nome') as string)?.trim();
  const codigo = ((formData.get('codigo') as string) || '').trim() || null;
  if (!nome) throw new Error('Nome do cliente é obrigatório.');

  await prisma.cliente.update({ where: { id }, data: { nome, codigo } });
  revalidatePath('/coletas/cadastros');
  revalidatePath('/coletas');
}

export async function alternarClienteAtivo(id: string, ativo: boolean) {
  await prisma.cliente.update({ where: { id }, data: { ativo } });
  revalidatePath('/coletas/cadastros');
  revalidatePath('/coletas');
}

export async function deletarCliente(id: string) {
  try {
    await prisma.cliente.delete({ where: { id } });
  } catch {
    throw new Error('Não dá para excluir: este cliente já tem coletas ou rotas fixas registradas. Use "Desativar".');
  }
  revalidatePath('/coletas/cadastros');
}
