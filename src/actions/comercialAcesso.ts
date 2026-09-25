'use server';

import { prisma } from '@/lib/prisma';
import { isAdmin } from './admin';
import { podeEscreverNoSetor } from './setorAcesso';

const CHAVE_SETOR = 'comercial_setor_id';

/**
 * O setor dono da área Comercial.
 *
 * Guardado em Config para sobreviver a renomear o setor. Sem nada configurado,
 * procura pelo nome — assim a área funciona desde o primeiro dia, sem exigir
 * que alguém preencha uma configuração antes.
 */
export async function getSetorComercial(): Promise<{ id: string; nome: string } | null> {
  const cfg = await prisma.config.findUnique({ where: { chave: CHAVE_SETOR } });
  const valor = cfg?.valor?.trim();
  if (valor) {
    const porId = await prisma.setor.findUnique({
      where: { id: valor },
      select: { id: true, nome: true },
    });
    if (porId) return porId;
  }

  return prisma.setor.findFirst({
    where: { nome: { contains: 'omercial' } },
    select: { id: true, nome: true },
  });
}

/**
 * Quem pode usar a área Comercial: o admin, ou quem entrou com a senha do
 * setor Comercial — a mesma que eles já usam no checklist de POPs. Sem senha
 * nova para decorar.
 *
 * Aqui a senha é obrigatória, diferente dos POPs, onde setor sem senha é aberto
 * a qualquer um. A ficha do cliente guarda a senha do ID Correios dele: setor
 * sem senha deixaria isso à vista de qualquer pessoa logada. Quando não houver
 * senha cadastrada, a tela manda cadastrar em vez de pedir uma senha que não
 * existe.
 */
export async function podeUsarComercial(): Promise<boolean> {
  if (await isAdmin()) return true;
  const setor = await getSetorComercial();
  return setor ? podeEscreverNoSetor(setor.id) : false;
}

/** true se o setor Comercial ainda não tem senha — a área fica fechada até ter. */
export async function comercialSemSenha(): Promise<boolean> {
  const setor = await getSetorComercial();
  if (!setor) return false;

  const comSenha = await prisma.setor.findUnique({
    where: { id: setor.id },
    select: { senha: true },
  });
  return !comSenha?.senha;
}
