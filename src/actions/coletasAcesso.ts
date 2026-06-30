'use server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

const CHAVE_SENHA = 'coletas_senha';

export async function getColetasSenha() {
  const c = await prisma.config.findUnique({ where: { chave: CHAVE_SENHA } });
  return c?.valor ?? null;
}

export async function temSenhaColetas() {
  const s = await getColetasSenha();
  return !!s && s.trim() !== '';
}

/** Admin define/altera/remove a senha (vazio = remove a proteção). */
export async function definirSenhaColetas(formData: FormData) {
  const senha = ((formData.get('senha') as string) || '').trim();
  await prisma.config.upsert({
    where: { chave: CHAVE_SENHA },
    update: { valor: senha },
    create: { chave: CHAVE_SENHA, valor: senha },
  });
  revalidatePath('/coletas/cadastros');
  revalidatePath('/coletas');
}

export async function verificarSenhaColetas(senhaTentativa: string) {
  const senha = await getColetasSenha();
  if (!senha || senha.trim() === '') return { success: true };

  if (senha === senhaTentativa) {
    const cookieStore = await cookies();
    cookieStore.set('auth_coletas', 'true', {
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: '/',
    });
    revalidatePath('/coletas');
    return { success: true };
  }
  return { success: false, error: 'Senha incorreta' };
}

/** true se as coletas podem ser acessadas (sem senha ou já autenticado). */
export async function coletasLiberado() {
  const senha = await getColetasSenha();
  if (!senha || senha.trim() === '') return true;
  const cookieStore = await cookies();
  return cookieStore.has('auth_coletas');
}
