'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { normalizarQuebrasDeLinha } from '@/lib/texto';

export async function createPop(formData: FormData) {
  const titulo = formData.get('titulo') as string;
  const setorId = formData.get('setorId') as string;
  const orientacaoAvaliacao = formData.get('orientacaoAvaliacao') as string;
  const instrucaoTrabalho = formData.get('instrucaoTrabalho') as string;
  const peso = Number(formData.get('peso') || 1);

  if (!titulo || !setorId || !orientacaoAvaliacao || !instrucaoTrabalho) {
    throw new Error('Todos os campos são obrigatórios.');
  }

  await prisma.pop.create({
    data: {
      titulo: normalizarQuebrasDeLinha(titulo),
      setorId,
      orientacaoAvaliacao: normalizarQuebrasDeLinha(orientacaoAvaliacao),
      instrucaoTrabalho: normalizarQuebrasDeLinha(instrucaoTrabalho),
      peso,
    },
  });

  revalidatePath(`/setores/${setorId}`);
  redirect(`/setores/${setorId}`);
}

export async function updatePop(id: string, formData: FormData) {
  const titulo = formData.get('titulo') as string;
  const setorId = formData.get('setorId') as string;
  const orientacaoAvaliacao = formData.get('orientacaoAvaliacao') as string;
  const instrucaoTrabalho = formData.get('instrucaoTrabalho') as string;
  const peso = Number(formData.get('peso') || 1);

  if (!titulo || !setorId || !orientacaoAvaliacao || !instrucaoTrabalho) {
    throw new Error('Todos os campos são obrigatórios.');
  }

  await prisma.pop.update({
    where: { id },
    data: {
      titulo: normalizarQuebrasDeLinha(titulo),
      setorId,
      orientacaoAvaliacao: normalizarQuebrasDeLinha(orientacaoAvaliacao),
      instrucaoTrabalho: normalizarQuebrasDeLinha(instrucaoTrabalho),
      peso,
    },
  });

  revalidatePath(`/setores/${setorId}`);
  redirect(`/setores/${setorId}`);
}

/**
 * Aposenta (ou reativa) um POP. Preferível a excluir: o POP some do checklist
 * do dia seguinte em diante, mas continua contando nos dias em que ainda valia,
 * então nenhum mês já fechado tem a nota recalculada.
 */
export async function alternarPopAtivo(id: string, setorId: string, ativar: boolean) {
  await prisma.pop.update({
    where: { id },
    data: { desativadoEm: ativar ? null : new Date() },
  });

  revalidatePath(`/setores/${setorId}`);
  revalidatePath(`/setores/${setorId}/relatorio`);
}

/**
 * Exclusão definitiva. Recusa se o POP já aparece em algum checklist: apagá-lo
 * reescreveria a nota dos meses em que ele foi cobrado (e apagaria pendências
 * já atribuídas a alguém). Nesse caso o caminho certo é desativar.
 */
export async function deletePop(id: string, setorId: string) {
  const registros = await prisma.registroDiario.findMany({
    where: { setorId },
    select: { respostas: true },
  });

  const temHistorico = registros.some((reg) =>
    Object.prototype.hasOwnProperty.call((reg.respostas ?? {}) as object, id),
  );

  if (temHistorico) {
    throw new Error(
      'Este POP já foi usado em checklists e não pode ser excluído — apagá-lo mudaria a nota de meses já fechados. Use "Desativar": ele sai do checklist a partir de amanhã e o histórico fica preservado.',
    );
  }

  await prisma.pop.delete({ where: { id } });
  revalidatePath(`/setores/${setorId}`);
}

/**
 * @param incluirDesativados use `true` para cálculos e relatórios (o histórico
 * precisa dos POPs aposentados), `false` para telas de preenchimento.
 */
export async function getPopsBySetor(setorId: string, incluirDesativados = false) {
  return await prisma.pop.findMany({
    where: { setorId, ...(incluirDesativados ? {} : { desativadoEm: null }) },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getPopById(id: string) {
  return await prisma.pop.findUnique({
    where: { id },
    include: { setor: true }
  });
}
