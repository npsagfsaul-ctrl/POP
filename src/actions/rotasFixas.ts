'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { PeriodoColeta } from '@prisma/client';

export async function getRotasFixas() {
  return prisma.rotaFixa.findMany({
    include: { coletor: true, cliente: true },
    orderBy: [{ periodo: 'asc' }, { createdAt: 'asc' }],
  });
}

function extrairCampos(formData: FormData) {
  const periodo = formData.get('periodo') as PeriodoColeta;
  const coletorId = formData.get('coletorId') as string;
  const clienteId = formData.get('clienteId') as string;
  const observacao = ((formData.get('observacao') as string) || '').trim() || null;

  const dias: number[] = [];
  for (let d = 1; d <= 6; d++) {
    if (formData.get(`dia_${d}`) === 'on') dias.push(d);
  }

  if (!periodo || !coletorId || !clienteId) {
    throw new Error('Período, coletor e cliente são obrigatórios.');
  }
  if (dias.length === 0) {
    throw new Error('Selecione ao menos um dia da semana.');
  }

  return { periodo, coletorId, clienteId, observacao, dias };
}

export async function criarRotaFixa(formData: FormData) {
  const campos = extrairCampos(formData);
  await prisma.rotaFixa.create({ data: campos });
  revalidatePath('/coletas/cadastros');
  revalidatePath('/coletas');
}

export async function atualizarRotaFixa(id: string, formData: FormData) {
  const campos = extrairCampos(formData);
  await prisma.rotaFixa.update({ where: { id }, data: campos });
  revalidatePath('/coletas/cadastros');
  revalidatePath('/coletas');
}

export async function alternarRotaFixaAtivo(id: string, ativo: boolean) {
  await prisma.rotaFixa.update({ where: { id }, data: { ativo } });
  revalidatePath('/coletas/cadastros');
  revalidatePath('/coletas');
}

export async function deletarRotaFixa(id: string) {
  // As coletas já geradas por esta rota são mantidas (rotaFixaId vira null).
  await prisma.rotaFixa.delete({ where: { id } });
  revalidatePath('/coletas/cadastros');
  revalidatePath('/coletas');
}
