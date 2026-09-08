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
  /** Mês/ano da prospecção. Sem isso, a lista não tem recorte de tempo. */
  mes?: number;
  ano?: number;
}

/**
 * Recorte por mês, pela data da prospecção (a mesma que aparece na coluna Data).
 *
 * O mês é um filtro que se escolhe, nunca o padrão: "em aberto" é fila de
 * trabalho, e uma prospecção em aberto de agosto continua pedindo ação em
 * setembro — se o mês entrasse no padrão, ela sumiria da fila na virada.
 */
function condicaoDeMes(mes?: number, ano?: number) {
  if (!mes || !ano) return {};
  return {
    data: {
      gte: new Date(Date.UTC(ano, mes - 1, 1)),
      lt: new Date(Date.UTC(ano, mes, 1)),
    },
  };
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
      ...condicaoDeMes(filtros.mes, filtros.ano),
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
    select: { status: true, data: true },
  });

  const porStatus: Record<string, number> = {};
  // Meses que realmente têm registro — a lista do seletor sai daqui, então ele
  // nunca oferece um mês vazio.
  const porMes = new Map<string, number>();

  for (const r of registros) {
    porStatus[r.status] = (porStatus[r.status] || 0) + 1;
    const d = new Date(r.data);
    const chave = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    porMes.set(chave, (porMes.get(chave) || 0) + 1);
  }

  const meses = [...porMes.entries()]
    .sort((a, b) => b[0].localeCompare(a[0])) // mais recente primeiro
    .map(([chave, total]) => {
      const [ano, mes] = chave.split('-').map(Number);
      return { ano, mes, total };
    });

  const emAberto = await prisma.prospeccao.count({
    where: { ...where, ...condicaoDeEscopo('aberto') },
  });

  return { porStatus, total: registros.length, emAberto, meses, encerrados: STATUS_ENCERRADOS };
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
