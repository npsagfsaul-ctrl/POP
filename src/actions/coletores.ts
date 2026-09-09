'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { PALETA_COLETORES, proximaCorDaPaleta } from '@/lib/coletasStatus';

export async function getColetores(apenasAtivos = false) {
  return prisma.coletor.findMany({
    where: apenasAtivos ? { ativo: true } : undefined,
    orderBy: { nome: 'asc' },
  });
}

export async function criarColetor(formData: FormData) {
  const nome = (formData.get('nome') as string)?.trim();
  if (!nome) throw new Error('Nome do coletor é obrigatório.');

  // A cor é escolhida pelo sistema, da paleta, e não por quem cadastra.
  const existentes = await prisma.coletor.findMany({ select: { cor: true } });
  const cor = proximaCorDaPaleta(existentes.map((c) => c.cor));

  await prisma.coletor.create({ data: { nome, cor } });
  revalidatePath('/coletas/cadastros');
  revalidatePath('/coletas');
}

export async function atualizarColetor(id: string, formData: FormData) {
  const nome = (formData.get('nome') as string)?.trim();
  if (!nome) throw new Error('Nome do coletor é obrigatório.');

  // A cor não vem do formulário: quem já tem cor mantém a dele.
  await prisma.coletor.update({ where: { id }, data: { nome } });
  revalidatePath('/coletas/cadastros');
  revalidatePath('/coletas');
}

/**
 * Passa todos os coletores para a paleta padrão, em ordem alfabética.
 *
 * Existe porque os coletores foram cadastrados quando a cor era escolhida à
 * mão: sobraram tons que não combinam entre si. É para rodar uma vez.
 */
export async function normalizarCoresColetores() {
  const coletores = await prisma.coletor.findMany({ orderBy: { nome: 'asc' } });

  for (let i = 0; i < coletores.length; i++) {
    const cor = PALETA_COLETORES[i % PALETA_COLETORES.length];
    if (coletores[i].cor === cor) continue;
    await prisma.coletor.update({ where: { id: coletores[i].id }, data: { cor } });
  }

  revalidatePath('/coletas/cadastros');
  revalidatePath('/coletas');
  return { ajustados: coletores.length };
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
