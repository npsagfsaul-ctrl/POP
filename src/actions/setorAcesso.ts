'use server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { isAdmin } from './admin';

/**
 * Quem pode ver este setor: o admin, qualquer pessoa se o setor não tem senha,
 * ou quem já entrou com a senha dele.
 *
 * Mesma regra que a página do setor usa — fica aqui para a rota de download
 * não divergir da tela. POP é procedimento de trabalho: quem tem acesso ao
 * setor tem que conseguir baixar os próprios POPs sem depender do admin.
 */
export async function podeVerSetor(setorId: string): Promise<boolean> {
  if (await isAdmin()) return true;

  const setor = await prisma.setor.findUnique({
    where: { id: setorId },
    select: { senha: true },
  });
  if (!setor) return false;
  if (!setor.senha) return true;

  const cookieStore = await cookies();
  return cookieStore.has(`auth_setor_${setorId}`);
}

/**
 * Quem pode PUBLICAR em nome deste setor: o admin, ou quem entrou com a senha.
 *
 * Mais restrito que `podeVerSetor` de propósito: lá, setor sem senha é aberto a
 * qualquer um — o que serve para ler POP, mas não para publicar no mural, que
 * a agência inteira enxerga. Setor sem senha simplesmente não publica.
 */
export async function podeEscreverNoSetor(setorId: string): Promise<boolean> {
  if (await isAdmin()) return true;

  const cookieStore = await cookies();
  return cookieStore.has(`auth_setor_${setorId}`);
}
