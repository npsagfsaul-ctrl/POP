'use server';

import { prisma } from '@/lib/prisma';
import { isAdmin } from './admin';
import { podeVerSetor } from './setorAcesso';

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
 * Se o setor Comercial não tiver senha, a área fica aberta, como acontece com
 * os POPs. É de propósito: pedir uma senha que não existe daria uma tela sem
 * saída, e quem configura senha de setor é o admin, em Configurações.
 */
export async function podeUsarComercial(): Promise<boolean> {
  if (await isAdmin()) return true;
  const setor = await getSetorComercial();
  return setor ? podeVerSetor(setor.id) : false;
}
