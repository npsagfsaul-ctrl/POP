'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { StatusProspeccao } from '@prisma/client';
import { podeEditarComercial } from './comercialAcesso';
import { hojeISOSaoPaulo } from '@/lib/data';

function parseData(dataString: string) {
  const data = new Date(dataString);
  data.setUTCHours(0, 0, 0, 0);
  return data;
}

export interface FiltrosProspeccao {
  setorId?: string;
  atendenteId?: string;
  status?: StatusProspeccao;
  /** Mês e ano da tela. Sem eles, traz tudo — é o que a exportação usa. */
  mes?: number;
  ano?: number;
}

export async function getProspeccoes(filtros: FiltrosProspeccao = {}) {
  // Primeiro dia deste mês até o primeiro dia do mês seguinte. Em UTC, que é
  // como a coluna `data` é gravada — o servidor roda fora do nosso fuso.
  const doMes =
    filtros.mes && filtros.ano
      ? {
          gte: new Date(Date.UTC(filtros.ano, filtros.mes - 1, 1)),
          lt: new Date(Date.UTC(filtros.ano, filtros.mes, 1)),
        }
      : undefined;

  return prisma.prospeccao.findMany({
    where: {
      setorId: filtros.setorId || undefined,
      atendenteId: filtros.atendenteId || undefined,
      status: filtros.status || undefined,
      data: doMes,
    },
    include: { setor: true, atendente: true },
    orderBy: { data: 'desc' },
  });
}

/**
 * Os meses que a tela oferece: do mais antigo lançamento até o mês de hoje.
 *
 * Existe porque as setinhas de mês servem para andar de um em um, e voltar
 * alguns meses assim é clicar muito. O seletor fica junto dos outros filtros,
 * que é onde a pessoa procura.
 */
export async function getMesesDeProspeccao(incluir?: { mes: number; ano: number }) {
  const [anoHoje, mesHoje] = hojeISOSaoPaulo().split('-').map(Number);

  const { _min } = await prisma.prospeccao.aggregate({ _min: { data: true } });
  const primeiro = _min.data ? new Date(_min.data) : null;

  let ano = primeiro ? primeiro.getUTCFullYear() : anoHoje;
  let mes = primeiro ? primeiro.getUTCMonth() + 1 : mesHoje;

  const meses: { mes: number; ano: number }[] = [];
  while (ano < anoHoje || (ano === anoHoje && mes <= mesHoje)) {
    meses.push({ mes, ano });
    if (mes === 12) {
      mes = 1;
      ano += 1;
    } else {
      mes += 1;
    }
  }

  // O mês que está na tela entra na lista mesmo fora do intervalo — dá para
  // chegar num mês vazio pelas setinhas, e o seletor não pode ficar em branco.
  if (incluir && !meses.some((m) => m.mes === incluir.mes && m.ano === incluir.ano)) {
    meses.push(incluir);
  }

  return meses.sort((a, b) => b.ano - a.ano || b.mes - a.mes);
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

/**
 * A observação do Comercial, salva à parte.
 *
 * Não entra em `atualizarProspeccao` de propósito: aquele formulário é de quem
 * lança a prospecção, e qualquer setor usa. A trava fica aqui e não só na
 * tela — Server Action é endereço público, e esconder o botão não impede
 * ninguém de chamar a função.
 */
export async function salvarObservacaoProspeccao(id: string, texto: string) {
  if (!(await podeEditarComercial())) {
    throw new Error('Só o setor Comercial escreve a observação. Entre pelo Comercial para anotar.');
  }

  await prisma.prospeccao.update({
    where: { id },
    data: { observacao: texto.trim() || null },
  });

  revalidatePath('/prospeccao');
}

export async function deletarProspeccao(id: string) {
  await prisma.prospeccao.delete({ where: { id } });
  revalidatePath('/prospeccao');
}
