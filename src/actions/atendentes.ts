'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

function revalidarTudo() {
  revalidatePath('/coletas/cadastros');
  revalidatePath('/coletas');
  revalidatePath('/prospeccao/cadastros');
  revalidatePath('/prospeccao');
  revalidatePath('/setores', 'layout');
}

export async function getAtendentes(apenasAtivos = false) {
  return prisma.atendente.findMany({
    where: apenasAtivos ? { ativo: true } : undefined,
    include: { setor: { select: { id: true, nome: true } } },
    orderBy: { nome: 'asc' },
  });
}

/**
 * Funcionários que podem ser apontados como responsáveis num setor:
 * os do próprio setor, mais os que não têm setor definido (coringas, que
 * circulam por mais de um). Sem isso, o checklist de um setor pequeno
 * mostraria a empresa inteira no seletor.
 */
export async function getAtendentesPorSetor(setorId: string, apenasAtivos = true) {
  return prisma.atendente.findMany({
    where: {
      ...(apenasAtivos ? { ativo: true } : {}),
      OR: [{ setorId }, { setorId: null }],
    },
    orderBy: { nome: 'asc' },
  });
}

export async function criarAtendente(formData: FormData) {
  const nome = (formData.get('nome') as string)?.trim();
  const setorId = ((formData.get('setorId') as string) || '').trim() || null;
  if (!nome) throw new Error('Nome do funcionário é obrigatório.');

  await prisma.atendente.create({ data: { nome, setorId } });
  revalidarTudo();
}

export async function atualizarAtendente(id: string, formData: FormData) {
  const nome = (formData.get('nome') as string)?.trim();
  const setorId = ((formData.get('setorId') as string) || '').trim() || null;
  if (!nome) throw new Error('Nome do funcionário é obrigatório.');

  await prisma.atendente.update({ where: { id }, data: { nome, setorId } });
  revalidarTudo();
}

export async function alternarAtendenteAtivo(id: string, ativo: boolean) {
  await prisma.atendente.update({ where: { id }, data: { ativo } });
  revalidarTudo();
}

export async function deletarAtendente(id: string) {
  try {
    await prisma.atendente.delete({ where: { id } });
  } catch {
    throw new Error('Não dá para excluir: este funcionário já tem coletas ou prospecções registradas. Use "Desativar".');
  }
  revalidarTudo();
}
