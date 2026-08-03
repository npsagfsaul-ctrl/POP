'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import {
  calcularConformidade,
  calcularPendenciasPorPessoa,
  calcularFatiaFinal,
  simularReguas,
  analisarConcentracao,
  FAIXAS_PADRAO,
  type FaixasPremiacao,
  type ResultadoRegua,
  type Concentracao,
} from '@/lib/conformidade';
import { getAtendentes } from './atendentes';

const CHAVES = {
  integral: 'premio_limite_integral',
  l75: 'premio_limite_75',
  l50: 'premio_limite_50',
} as const;

/** Faixas configuradas pelo admin (cai no padrão quando nunca foram definidas). */
export async function getFaixasPremiacao(): Promise<FaixasPremiacao> {
  const linhas = await prisma.config.findMany({
    where: { chave: { in: [CHAVES.integral, CHAVES.l75, CHAVES.l50] } },
  });
  const valor = (chave: string, padrao: number) => {
    const n = parseInt(linhas.find((l) => l.chave === chave)?.valor ?? '', 10);
    return Number.isFinite(n) && n >= 0 ? n : padrao;
  };

  return {
    limiteIntegral: valor(CHAVES.integral, FAIXAS_PADRAO.limiteIntegral),
    limite75: valor(CHAVES.l75, FAIXAS_PADRAO.limite75),
    limite50: valor(CHAVES.l50, FAIXAS_PADRAO.limite50),
  };
}

export async function definirFaixasPremiacao(formData: FormData) {
  const ler = (nome: string) => parseInt((formData.get(nome) as string) || '', 10);
  const integral = ler('limiteIntegral');
  const l75 = ler('limite75');
  const l50 = ler('limite50');

  if (![integral, l75, l50].every((n) => Number.isFinite(n) && n >= 0)) {
    throw new Error('Os limites precisam ser números iguais ou maiores que zero.');
  }
  // Faixas fora de ordem tornariam algumas delas inalcançáveis.
  if (!(integral < l75 && l75 < l50)) {
    throw new Error('Os limites precisam ser crescentes: o de 100% menor que o de 75%, e este menor que o de 50%.');
  }

  await prisma.$transaction([
    prisma.config.upsert({
      where: { chave: CHAVES.integral },
      update: { valor: String(integral) },
      create: { chave: CHAVES.integral, valor: String(integral) },
    }),
    prisma.config.upsert({
      where: { chave: CHAVES.l75 },
      update: { valor: String(l75) },
      create: { chave: CHAVES.l75, valor: String(l75) },
    }),
    prisma.config.upsert({
      where: { chave: CHAVES.l50 },
      update: { valor: String(l50) },
      create: { chave: CHAVES.l50, valor: String(l50) },
    }),
  ]);

  revalidatePath('/admin/premiacao');
}

export interface PessoaPremiacao {
  atendenteId: string | null;
  nome: string;
  removido: boolean;
  setorNome: string;
  setorId: string;
  setorBateuMeta: boolean;
  setorPercentual: number;
  totalPendencias: number;
  pesoTotal: number;
  diasDistintos: number;
  fatiaPremio: number;
}

export interface ResumoPremiacao {
  faixas: FaixasPremiacao;
  pessoas: PessoaPremiacao[];
  setores: {
    id: string;
    nome: string;
    percentual: number;
    bateuMeta: boolean;
    semResponsavel: number;
    concentracao: Concentracao;
  }[];
}

/** Busca todos os setores com os registros do mês — base comum das duas telas. */
async function carregarMes(mes: number, ano: number) {
  const inicio = new Date(`${ano}-${String(mes).padStart(2, '0')}-01T00:00:00Z`);
  const proxMes = mes === 12 ? 1 : mes + 1;
  const proxAno = mes === 12 ? ano + 1 : ano;
  const fim = new Date(`${proxAno}-${String(proxMes).padStart(2, '0')}-01T00:00:00Z`);

  const [setores, registros] = await Promise.all([
    prisma.setor.findMany({ include: { pops: true }, orderBy: { nome: 'asc' } }),
    prisma.registroDiario.findMany({ where: { data: { gte: inicio, lt: fim } } }),
  ]);

  return { setores, registros };
}

export interface SimulacaoSetor {
  id: string;
  nome: string;
  diasUteis: number;
  reguas: ResultadoRegua[];
}

/**
 * Roda o mesmo mês sob cada régua candidata, para todos os setores.
 * É só comparação — nenhuma nota é alterada por esta função.
 */
export async function getSimulacaoReguas(mes: number, ano: number): Promise<SimulacaoSetor[]> {
  const { setores, registros } = await carregarMes(mes, ano);

  return setores.map((setor) => {
    const doSetor = registros.filter((r) => r.setorId === setor.id);
    const { dias, diasUteis } = calcularConformidade(
      setor.pops, doSetor, mes, ano, new Date(), setor.createdAt,
    );
    return {
      id: setor.id,
      nome: setor.nome,
      diasUteis,
      reguas: simularReguas(dias),
    };
  });
}

/**
 * Consolida o fechamento do mês: para cada pessoa com pendências, quanto ela
 * acumulou e que fatia do prêmio mantém. Percorre todos os setores para a
 * gestão não precisar abrir sete relatórios.
 */
export async function getResumoPremiacao(mes: number, ano: number): Promise<ResumoPremiacao> {
  const [faixas, atendentes, { setores, registros }] = await Promise.all([
    getFaixasPremiacao(),
    getAtendentes(),
    carregarMes(mes, ano),
  ]);

  const pessoas: PessoaPremiacao[] = [];
  const resumoSetores: ResumoPremiacao['setores'] = [];

  for (const setor of setores) {
    const doSetor = registros.filter((r) => r.setorId === setor.id);
    const { percentualPerfeitos, bateuMeta, dias } = calcularConformidade(
      setor.pops, doSetor, mes, ano, new Date(), setor.createdAt,
    );
    const grupos = calcularPendenciasPorPessoa(dias, atendentes);

    resumoSetores.push({
      id: setor.id,
      nome: setor.nome,
      percentual: percentualPerfeitos,
      bateuMeta,
      semResponsavel: grupos.find((g) => g.atendenteId === null)?.totalPendencias ?? 0,
      concentracao: analisarConcentracao(dias, atendentes),
    });

    for (const g of grupos) {
      // O balde "sem responsável" não é pessoa — não entra no fechamento.
      if (g.atendenteId === null) continue;
      pessoas.push({
        atendenteId: g.atendenteId,
        nome: g.nome,
        removido: g.removido,
        setorNome: setor.nome,
        setorId: setor.id,
        setorBateuMeta: bateuMeta,
        setorPercentual: percentualPerfeitos,
        totalPendencias: g.totalPendencias,
        pesoTotal: g.pesoTotal,
        diasDistintos: g.diasDistintos,
        fatiaPremio: calcularFatiaFinal(g.pesoTotal, faixas, bateuMeta),
      });
    }
  }

  // Quem tem mais a perder primeiro.
  pessoas.sort((a, b) => a.fatiaPremio - b.fatiaPremio || b.pesoTotal - a.pesoTotal);

  return { faixas, pessoas, setores: resumoSetores };
}
