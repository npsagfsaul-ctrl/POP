'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getVeiculos(apenasAtivos = false) {
  return prisma.veiculo.findMany({
    where: apenasAtivos ? { ativo: true } : undefined,
    orderBy: { nome: 'asc' },
  });
}

export async function criarVeiculo(formData: FormData) {
  const nome = (formData.get('nome') as string)?.trim();
  const placa = ((formData.get('placa') as string) || '').trim() || null;
  if (!nome) throw new Error('Nome do veículo é obrigatório.');

  await prisma.veiculo.create({ data: { nome, placa } });
  revalidatePath('/coletas/cadastros');
  revalidatePath('/coletas/motorista');
}

export async function atualizarVeiculo(id: string, formData: FormData) {
  const nome = (formData.get('nome') as string)?.trim();
  const placa = ((formData.get('placa') as string) || '').trim() || null;
  if (!nome) throw new Error('Nome do veículo é obrigatório.');

  await prisma.veiculo.update({ where: { id }, data: { nome, placa } });
  revalidatePath('/coletas/cadastros');
  revalidatePath('/coletas/motorista');
}

export async function alternarVeiculoAtivo(id: string, ativo: boolean) {
  await prisma.veiculo.update({ where: { id }, data: { ativo } });
  revalidatePath('/coletas/cadastros');
  revalidatePath('/coletas/motorista');
}

export async function deletarVeiculo(id: string) {
  try {
    await prisma.veiculo.delete({ where: { id } });
  } catch {
    throw new Error('Não dá para excluir: este veículo já tem turnos registrados. Use "Desativar".');
  }
  revalidatePath('/coletas/cadastros');
}
