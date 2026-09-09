'use server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { podeEscreverNoSetor } from './setorAcesso';

const CHAVE_SENHA = 'coletas_senha';
const CHAVE_SETOR = 'coletas_setor_id';

/**
 * Setor cujos funcionários aparecem no campo "Funcionário" das Coletas.
 * Sem isso, o seletor lista a empresa inteira — e quem lança coleta é de um
 * setor só. Guardado em Config (e não fixo no código) para sobreviver a
 * renomear o setor. `null` = mostra todos, que era o comportamento anterior.
 */
export async function getSetorColetas(): Promise<string | null> {
  const c = await prisma.config.findUnique({ where: { chave: CHAVE_SETOR } });
  const valor = c?.valor?.trim();
  return valor ? valor : null;
}

export async function definirSetorColetas(formData: FormData) {
  const setorId = ((formData.get('setorId') as string) || '').trim();
  await prisma.config.upsert({
    where: { chave: CHAVE_SETOR },
    update: { valor: setorId },
    create: { chave: CHAVE_SETOR, valor: setorId },
  });
  revalidatePath('/coletas/cadastros');
  revalidatePath('/coletas');
}

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

/**
 * true se as coletas podem ser vistas.
 *
 * Três caminhos, de propósito:
 * - não há senha configurada;
 * - a pessoa entrou com a senha das Coletas (é o caso dos coletores, que só
 *   consultam a rota);
 * - a pessoa já está autenticada no setor responsável pelas coletas.
 *
 * O terceiro caminho existe para o Atendimento Interno não ter que decorar
 * duas senhas: eles já entram no próprio setor todo dia para o checklist, e
 * essa mesma senha é a que autoriza mexer na lista.
 */
export async function coletasLiberado() {
  const senha = await getColetasSenha();
  if (!senha || senha.trim() === '') return true;

  const cookieStore = await cookies();
  if (cookieStore.has('auth_coletas')) return true;

  const setorColetas = await getSetorColetas();
  return setorColetas ? podeEscreverNoSetor(setorColetas) : false;
}
