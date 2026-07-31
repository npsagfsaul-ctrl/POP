'use server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

const COOKIE_NOME = 'coletor_id';

/** Identifica o coletor no celular (sem senha individual — só escolha do nome). */
export async function selecionarColetor(coletorId: string) {
  const coletor = await prisma.coletor.findUnique({ where: { id: coletorId } });
  if (!coletor || !coletor.ativo) {
    throw new Error('Coletor inválido.');
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NOME, coletorId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 dias
    path: '/',
  });
}

export async function getColetorAtual() {
  const cookieStore = await cookies();
  const id = cookieStore.get(COOKIE_NOME)?.value;
  if (!id) return null;

  const coletor = await prisma.coletor.findUnique({ where: { id } });
  if (!coletor || !coletor.ativo) return null;
  return coletor;
}

/** Botão "Trocar coletor" — para dispositivo compartilhado entre coletores. */
export async function sairColetor() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NOME);
}
