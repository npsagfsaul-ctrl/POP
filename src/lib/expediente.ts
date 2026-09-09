// Dias de expediente por setor e feriados nacionais.
//
// Antes disso o cálculo tinha uma regra só: "não é domingo, então conta". Com
// isso, Financeiro, Administrativo e Comercial — que não abrem aos sábados —
// eram medidos sobre 4 sábados e os feriados de cada mês, dias em que a porta
// estava fechada.

import { temExpediente, type Expediente } from './conformidade';

export const CHAVE_EXPEDIENTE_VALE_DE = 'expediente_vale_de';

/** O que vale para a agência inteira: dias fechados e a partir de quando conta. */
export interface ContextoExpediente {
  semExpediente: Set<string>;
  valeAPartirDe: string | null;
}

/**
 * Junta o que é do setor (dias da semana) com o que é da agência (dias fechados).
 * Síncrono e num lugar só, para os nove pontos de chamada montarem igual.
 */
export function montarExpediente(
  diasExpediente: string | null | undefined,
  contexto: ContextoExpediente,
): Expediente {
  return {
    diasSemana: parseDiasExpediente(diasExpediente),
    semExpediente: contexto.semExpediente,
    valeAPartirDe: contexto.valeAPartirDe,
  };
}

export const NOMES_DIA_SEMANA: Record<number, string> = {
  1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado',
};

/** "1,2,3,4,5" → [1,2,3,4,5]. Ignora lixo e domingo; nunca devolve vazio. */
export function parseDiasExpediente(valor: string | null | undefined): number[] {
  const dias = (valor ?? '')
    .split(',')
    .map((p) => Number(p.trim()))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 6);
  const unicos = [...new Set(dias)].sort((a, b) => a - b);
  // Setor sem nenhum dia marcado não teria nota nenhuma; melhor cair no padrão
  // antigo (seg–sáb) do que zerar o mês de alguém por um dado corrompido.
  return unicos.length > 0 ? unicos : [1, 2, 3, 4, 5, 6];
}

export function formatarDiasExpediente(valor: string | null | undefined): string {
  const dias = parseDiasExpediente(valor);
  const seq = dias.every((d, i) => i === 0 || d === dias[i - 1] + 1);
  if (seq && dias.length > 2) {
    return `${NOMES_DIA_SEMANA[dias[0]].slice(0, 3)} a ${NOMES_DIA_SEMANA[dias[dias.length - 1]].slice(0, 3)}`;
  }
  return dias.map((d) => NOMES_DIA_SEMANA[d].slice(0, 3)).join(', ');
}

/**
 * Dias do mês (YYYY-MM-DD) em que o setor NÃO tem expediente — sem contar
 * domingo, que as telas já tratam. Usa a mesma função do cálculo, para o
 * calendário nunca mostrar um dia que a conta considera de outro jeito.
 */
export function diasSemExpedienteNoMes(
  mes: number,
  ano: number,
  expediente: Expediente,
): string[] {
  const total = new Date(ano, mes, 0).getDate();
  const fora: string[] = [];
  for (let dia = 1; dia <= total; dia++) {
    const diaSemana = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
    if (diaSemana === 0) continue;
    const iso = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    if (!temExpediente(iso, diaSemana, expediente)) fora.push(iso);
  }
  return fora;
}

/** Domingo de Páscoa (algoritmo gregoriano de Meeus/Jones/Butcher). */
export function domingoDePascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function somarDias(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

export interface FeriadoNacional {
  data: string; // YYYY-MM-DD
  nome: string;
  /** Carnaval e Corpus Christi são ponto facultativo, não feriado por lei. */
  facultativo?: boolean;
}

/**
 * Feriados nacionais do ano, com as datas móveis calculadas a partir da Páscoa.
 *
 * Municipal NÃO entra: às vezes o Correios central pede para abrir, então esse
 * dia só vira "sem expediente" quando a agência de fato fechar.
 */
export function feriadosNacionais(ano: number): FeriadoNacional[] {
  const pascoa = domingoDePascoa(ano);

  const fixos: FeriadoNacional[] = [
    { data: `${ano}-01-01`, nome: 'Confraternização Universal' },
    { data: `${ano}-04-21`, nome: 'Tiradentes' },
    { data: `${ano}-05-01`, nome: 'Dia do Trabalho' },
    { data: `${ano}-09-07`, nome: 'Independência' },
    { data: `${ano}-10-12`, nome: 'Nossa Senhora Aparecida' },
    { data: `${ano}-11-02`, nome: 'Finados' },
    { data: `${ano}-11-15`, nome: 'Proclamação da República' },
    { data: `${ano}-11-20`, nome: 'Consciência Negra' },
    { data: `${ano}-12-25`, nome: 'Natal' },
  ];

  const moveis: FeriadoNacional[] = [
    { data: iso(somarDias(pascoa, -48)), nome: 'Carnaval (segunda)', facultativo: true },
    { data: iso(somarDias(pascoa, -47)), nome: 'Carnaval (terça)', facultativo: true },
    { data: iso(somarDias(pascoa, -2)), nome: 'Sexta-feira Santa' },
    { data: iso(somarDias(pascoa, 60)), nome: 'Corpus Christi', facultativo: true },
  ];

  return [...fixos, ...moveis]
    // Domingo já não conta em lugar nenhum — não precisa entrar na lista.
    .filter((f) => new Date(`${f.data}T00:00:00Z`).getUTCDay() !== 0)
    .sort((a, b) => a.data.localeCompare(b.data));
}
