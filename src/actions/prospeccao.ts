'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { StatusProspeccao } from '@prisma/client';
// A regra de "o que ainda pede ação" mora no lib: arquivo 'use server' só pode
// exportar função assíncrona, e ela precisa ser lida também pelas telas.
import {
  STATUS_ABERTOS, STATUS_ENCERRADOS, DIAS_SEM_RETORNO_NA_LISTA, EscopoProspeccao,
} from '@/lib/prospeccaoStatus';

function parseData(dataString: string) {
  const data = new Date(dataString);
  data.setUTCHours(0, 0, 0, 0);
  return data;
}

export interface FiltrosProspeccao {
  setorId?: string;
  atendenteId?: string;
  escopo?: EscopoProspeccao;
}

function limiteSemRetorno(): Date {
  const d = new Date();
  d.setDate(d.getDate() - DIAS_SEM_RETORNO_NA_LISTA);
  return d;
}

function condicaoDeEscopo(escopo: EscopoProspeccao | undefined) {
  if (!escopo || escopo === 'todas') return {};
  if (escopo === 'aberto') {
    return {
      OR: [
        { status: { in: STATUS_ABERTOS } },
        // Sem retorno continua em aberto só enquanto for recente.
        { status: 'SEM_RETORNO' as StatusProspeccao, updatedAt: { gte: limiteSemRetorno() } },
      ],
    };
  }
  return { status: escopo };
}

export async function getProspeccoes(filtros: FiltrosProspeccao = {}) {
  return prisma.prospeccao.findMany({
    where: {
      setorId: filtros.setorId || undefined,
      atendenteId: filtros.atendenteId || undefined,
      ...condicaoDeEscopo(filtros.escopo),
    },
    include: { setor: true, atendente: true },
    orderBy: { data: 'desc' },
  });
}

/**
 * Totais por status e total geral, ignorando o escopo.
 *
 * Os cartões do topo têm que continuar contando TUDO mesmo quando a lista está
 * enxuta — senão a tela passaria a esconder números em vez de só esconder linhas.
 */
export async function getResumoProspeccao(
  filtros: Pick<FiltrosProspeccao, 'setorId' | 'atendenteId'> = {},
) {
  const where = {
    setorId: filtros.setorId || undefined,
    atendenteId: filtros.atendenteId || undefined,
  };

  const registros = await prisma.prospeccao.findMany({
    where,
    select: { status: true },
  });

  const porStatus: Record<string, number> = {};
  for (const r of registros) porStatus[r.status] = (porStatus[r.status] || 0) + 1;

  const emAberto = await prisma.prospeccao.count({
    where: { ...where, ...condicaoDeEscopo('aberto') },
  });

  return { porStatus, total: registros.length, emAberto, encerrados: STATUS_ENCERRADOS };
}

export async function criarProspeccao(formData: FormData) {
  const dataString = formData.get('data') as string;
  const nomeCliente = (formData.get('nomeCliente') as string)?.trim();
  const telefone = ((formData.get('telefone') as string) || '').trim() || null;
  const oQueVende = ((formData.get('oQueVende') as string) || '').trim() || null;
  // Cliente recém-cadastrado nasce como "Novo": só vira "Em contato" quando
  // alguém de fato abordou.
  const status = (formData.get('status') as StatusProspeccao) || 'NOVO';
  const setorId = formData.get('setorId') as string;
  const atendenteId = formData.get('atendenteId') as string;

  if (!dataString || !nomeCliente || !setorId || !atendenteId) {
    throw new Error('Data, nome do cliente, setor e atendente são obrigatórios.');
  }

  await prisma.prospeccao.create({
    data: {
      data: parseData(dataString),
      nomeCliente,
      telefone,
      oQueVende,
      status,
      setorId,
      atendenteId,
    },
  });

  revalidatePath('/prospeccao');
}

export async function atualizarProspeccao(id: string, formData: FormData) {
  const dataString = formData.get('data') as string;
  const nomeCliente = (formData.get('nomeCliente') as string)?.trim();
  const telefone = ((formData.get('telefone') as string) || '').trim() || null;
  const oQueVende = ((formData.get('oQueVende') as string) || '').trim() || null;
  const status = (formData.get('status') as StatusProspeccao) || 'CONTATO';
  const setorId = formData.get('setorId') as string;
  const atendenteId = formData.get('atendenteId') as string;

  if (!dataString || !nomeCliente || !setorId || !atendenteId) {
    throw new Error('Data, nome do cliente, setor e atendente são obrigatórios.');
  }

  await prisma.prospeccao.update({
    where: { id },
    data: {
      data: parseData(dataString),
      nomeCliente,
      telefone,
      oQueVende,
      status,
      setorId,
      atendenteId,
    },
  });

  revalidatePath('/prospeccao');
}

export async function deletarProspeccao(id: string) {
  await prisma.prospeccao.delete({ where: { id } });
  revalidatePath('/prospeccao');
}
