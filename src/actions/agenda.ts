'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { podeEscreverNoSetor, podeVerSetor } from './setorAcesso';
import { INTERVALOS_MESES, Frequencia } from '@/lib/agenda';

function dataDeISO(dataISO: string) {
  const [ano, mes, dia] = dataISO.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function isoDeData(data: Date) {
  return new Date(data).toISOString().slice(0, 10);
}

export async function getAgendaDoSetor(setorId: string) {
  if (!(await podeVerSetor(setorId))) {
    throw new Error('Sem acesso a este setor.');
  }

  const itens = await prisma.itemAgenda.findMany({
    where: { setorId },
    orderBy: [{ ativo: 'desc' }, { titulo: 'asc' }],
    include: {
      // Só o histórico recente: o atraso olha 12 meses para trás, mais que isso
      // não é usado em tela nenhuma.
      feitos: {
        where: { data: { gte: dataDeISO(recuoDeMeses(13)) } },
        select: { data: true },
      },
    },
  });

  return itens.map((i) => ({
    id: i.id,
    titulo: i.titulo,
    observacao: i.observacao,
    frequencia: i.frequencia as Frequencia,
    diaSemana: i.diaSemana,
    diaMes: i.diaMes,
    semanaDoMes: i.semanaDoMes,
    intervaloMeses: i.intervaloMeses,
    mesBase: i.mesBase,
    ativo: i.ativo,
    criadoEm: isoDeData(i.createdAt),
    feitos: i.feitos.map((f) => isoDeData(f.data)),
  }));
}

/** Primeiro dia do mês N meses atrás — limite das consultas de histórico. */
function recuoDeMeses(meses: number): string {
  const hoje = new Date();
  const bruto = hoje.getUTCMonth() + 1 - meses;
  const ano = hoje.getUTCFullYear() + Math.floor((bruto - 1) / 12);
  const mes = ((bruto - 1 + 1200) % 12) + 1;
  return `${ano}-${String(mes).padStart(2, '0')}-01`;
}

export interface NovoItemAgenda {
  titulo: string;
  observacao?: string | null;
  frequencia: Frequencia;
  diaSemana?: number | null;
  diaMes?: number | null;
  semanaDoMes?: number | null;
  intervaloMeses?: number;
  mesBase?: number | null;
}

export async function criarItemAgenda(setorId: string, dados: NovoItemAgenda) {
  if (!(await podeEscreverNoSetor(setorId))) {
    throw new Error('É preciso entrar com a senha do setor para mexer na agenda.');
  }

  const titulo = dados.titulo?.trim();
  if (!titulo) throw new Error('O nome do processo é obrigatório.');

  const comum = {
    setorId, titulo,
    observacao: dados.observacao?.trim() || null,
  };

  if (dados.frequencia === 'DIARIA') {
    await prisma.itemAgenda.create({
      data: { ...comum, frequencia: 'DIARIA', intervaloMeses: 1 },
    });
  } else if (dados.frequencia === 'SEMANAL') {
    const dia = Number(dados.diaSemana);
    if (!Number.isInteger(dia) || dia < 0 || dia > 6) {
      throw new Error('Escolha o dia da semana.');
    }
    await prisma.itemAgenda.create({
      data: { ...comum, frequencia: 'SEMANAL', diaSemana: dia, intervaloMeses: 1 },
    });
  } else if (dados.frequencia === 'MENSAL_SEMANA') {
    const dia = Number(dados.diaSemana);
    if (!Number.isInteger(dia) || dia < 0 || dia > 6) {
      throw new Error('Escolha o dia da semana.');
    }
    const semana = Number(dados.semanaDoMes);
    if (![1, 2, 3, 4, -1].includes(semana)) {
      throw new Error('Escolha qual semana do mês.');
    }
    const intervalo = Number(dados.intervaloMeses ?? 1);
    if (!INTERVALOS_MESES.includes(intervalo as (typeof INTERVALOS_MESES)[number])) {
      throw new Error('Intervalo inválido.');
    }
    const mesBase = intervalo === 1 ? 1 : Number(dados.mesBase);
    if (!Number.isInteger(mesBase) || mesBase < 1 || mesBase > 12) {
      throw new Error('Escolha o mês a partir do qual a contagem começa.');
    }
    await prisma.itemAgenda.create({
      data: {
        ...comum,
        frequencia: 'MENSAL_SEMANA',
        diaSemana: dia,
        semanaDoMes: semana,
        intervaloMeses: intervalo,
        mesBase,
      },
    });
  } else {
    const dia = Number(dados.diaMes);
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
      throw new Error('Escolha o dia do mês (1 a 31).');
    }
    const intervalo = Number(dados.intervaloMeses ?? 1);
    if (!INTERVALOS_MESES.includes(intervalo as (typeof INTERVALOS_MESES)[number])) {
      throw new Error('Intervalo inválido.');
    }
    const mesBase = intervalo === 1 ? 1 : Number(dados.mesBase);
    if (!Number.isInteger(mesBase) || mesBase < 1 || mesBase > 12) {
      throw new Error('Escolha o mês a partir do qual a contagem começa.');
    }
    await prisma.itemAgenda.create({
      data: {
        setorId, titulo,
        observacao: dados.observacao?.trim() || null,
        frequencia: 'MENSAL',
        diaMes: dia,
        intervaloMeses: intervalo,
        mesBase,
      },
    });
  }

  revalidatePath(`/setores/${setorId}/agenda`);
  revalidatePath(`/setores/${setorId}`);
}

async function itemDoSetor(itemId: string) {
  const item = await prisma.itemAgenda.findUnique({
    where: { id: itemId },
    select: { id: true, setorId: true, ativo: true },
  });
  if (!item) throw new Error('Processo não encontrado.');
  if (!(await podeEscreverNoSetor(item.setorId))) {
    throw new Error('É preciso entrar com a senha do setor para mexer na agenda.');
  }
  return item;
}

export async function alternarItemAgenda(itemId: string) {
  const item = await itemDoSetor(itemId);
  await prisma.itemAgenda.update({
    where: { id: itemId },
    data: { ativo: !item.ativo },
  });
  revalidatePath(`/setores/${item.setorId}/agenda`);
  revalidatePath(`/setores/${item.setorId}`);
}

export async function excluirItemAgenda(itemId: string) {
  const item = await itemDoSetor(itemId);
  await prisma.itemAgenda.delete({ where: { id: itemId } });
  revalidatePath(`/setores/${item.setorId}/agenda`);
  revalidatePath(`/setores/${item.setorId}`);
}

/**
 * Marca (ou desmarca) uma ocorrência como feita.
 *
 * A chave é item + data da ocorrência, então marcar duas vezes não duplica —
 * o que importa para uma tela que várias pessoas do setor usam ao mesmo tempo.
 */
export async function alternarFeito(itemId: string, dataISO: string, feito: boolean) {
  const item = await itemDoSetor(itemId);
  const data = dataDeISO(dataISO);

  if (feito) {
    await prisma.agendaFeito.upsert({
      where: { itemId_data: { itemId, data } },
      create: { itemId, data },
      update: {},
    });
  } else {
    await prisma.agendaFeito.deleteMany({ where: { itemId, data } });
  }

  revalidatePath(`/setores/${item.setorId}/agenda`);
  revalidatePath(`/setores/${item.setorId}`);
}

/**
 * Dá baixa em várias ocorrências atrasadas do mesmo processo de uma vez.
 *
 * Um item mensal esquecido por meses acumula uma ocorrência por mês; sem isso a
 * pessoa teria que clicar em cada uma para o alerta sair da tela.
 */
export async function marcarVariasFeitas(itemId: string, datasISO: string[]) {
  const item = await itemDoSetor(itemId);
  if (datasISO.length === 0) return;

  await prisma.agendaFeito.createMany({
    data: datasISO.map((d) => ({ itemId, data: dataDeISO(d) })),
    skipDuplicates: true,
  });

  revalidatePath(`/setores/${item.setorId}/agenda`);
  revalidatePath(`/setores/${item.setorId}`);
}
