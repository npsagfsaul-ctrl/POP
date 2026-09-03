// Quando cada processo da agenda do setor cai, e o que está atrasado.
//
// Tudo aqui é função pura sobre datas YYYY-MM-DD, sem Date "solto": data de
// calendário comparada com texto não tem fuso para dar errado, que é a origem
// do bug que já derrubou a nota dos setores depois das 21h.

export type Frequencia = 'DIARIA' | 'SEMANAL' | 'MENSAL' | 'MENSAL_SEMANA';

export interface ItemAgendaCalc {
  id: string;
  frequencia: Frequencia;
  /** 0=dom … 6=sáb. SEMANAL e MENSAL_SEMANA. */
  diaSemana?: number | null;
  /** 1–31. Só para MENSAL. Cai no último dia se o mês for mais curto. */
  diaMes?: number | null;
  /** 1–4 = primeira…quarta, -1 = última. Só para MENSAL_SEMANA. */
  semanaDoMes?: number | null;
  /** A cada quantos meses repete. 1 = todo mês. */
  intervaloMeses: number;
  /** 1–12: o mês a partir do qual o intervalo conta. */
  mesBase?: number | null;
  ativo?: boolean;
  /**
   * Quando o item passou a existir (YYYY-MM-DD). Ocorrência anterior a isso não
   * conta: sem esse corte, cadastrar "toda segunda" hoje faria o sistema cobrar
   * todas as segundas do último ano de uma vez.
   */
  criadoEm?: string | null;
}

/**
 * Intervalos oferecidos — só divisores de 12.
 *
 * Um intervalo de 5 meses não fecha dentro do ano: cairia em jan/jun/nov e
 * depois em abr do ano seguinte, escorregando para sempre. Com divisores de 12
 * o ciclo repete igual todo ano, e o cálculo não precisa guardar ano nenhum.
 */
export const INTERVALOS_MESES = [1, 2, 3, 4, 6, 12] as const;

const NOMES_DIA_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const NOMES_MES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export function diasNoMes(mes: number, ano: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

function iso(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function diaDaSemana(ano: number, mes: number, dia: number): number {
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
}

/** true se o mês cai no ciclo do item (ex.: a cada 4 meses a partir de janeiro). */
function mesEstaNoCiclo(item: ItemAgendaCalc, mes: number): boolean {
  const intervalo = Math.max(1, item.intervaloMeses || 1);
  if (intervalo === 1) return true;
  const base = item.mesBase ?? 1;
  // O ciclo divide 12, então a diferença de meses dentro do ano já decide.
  return (((mes - base) % intervalo) + intervalo) % intervalo === 0;
}

/** As datas (YYYY-MM-DD) em que este item é devido no mês pedido. */
export function ocorrenciasNoMes(item: ItemAgendaCalc, mes: number, ano: number): string[] {
  if (item.ativo === false) return [];
  const total = diasNoMes(mes, ano);
  const desde = item.criadoEm ?? null;
  const naoVale = (data: string) => !!desde && data < desde;

  // Todo dia de expediente. Domingo fica de fora: a agência não abre.
  if (item.frequencia === 'DIARIA') {
    const datas: string[] = [];
    for (let dia = 1; dia <= total; dia++) {
      if (diaDaSemana(ano, mes, dia) === 0) continue;
      const data = iso(ano, mes, dia);
      if (!naoVale(data)) datas.push(data);
    }
    return datas;
  }

  if (item.frequencia === 'SEMANAL') {
    if (item.diaSemana == null) return [];
    const datas: string[] = [];
    for (let dia = 1; dia <= total; dia++) {
      if (diaDaSemana(ano, mes, dia) !== item.diaSemana) continue;
      const data = iso(ano, mes, dia);
      if (!naoVale(data)) datas.push(data);
    }
    return datas;
  }

  // "Primeira segunda", "última sexta". Não precisa do desvio de domingo: o dia
  // da semana é escolhido, e domingo não é opção.
  if (item.frequencia === 'MENSAL_SEMANA') {
    if (item.diaSemana == null || item.semanaDoMes == null) return [];
    if (!mesEstaNoCiclo(item, mes)) return [];

    const candidatos: number[] = [];
    for (let dia = 1; dia <= total; dia++) {
      if (diaDaSemana(ano, mes, dia) === item.diaSemana) candidatos.push(dia);
    }
    const indice = item.semanaDoMes === -1 ? candidatos.length - 1 : item.semanaDoMes - 1;
    // Um mês pode não ter a "quinta segunda" — nesse caso o processo
    // simplesmente não cai naquele mês.
    if (indice < 0 || indice >= candidatos.length) return [];

    const data = iso(ano, mes, candidatos[indice]);
    return naoVale(data) ? [] : [data];
  }

  if (item.diaMes == null) return [];
  if (!mesEstaNoCiclo(item, mes)) return [];

  // Dia 31 num mês de 30 cai no dia 30, senão o processo simplesmente
  // desapareceria nesses meses.
  let dia = Math.min(item.diaMes, total);

  // Domingo não tem expediente, então o processo passa para a segunda — decisão
  // da gestora. Se essa segunda já cairia no mês seguinte (o dia escolhido é o
  // último do mês E é domingo), antecipa para o sábado: a ocorrência tem que
  // continuar dentro do mês, senão ela sai da grade e desaparece da tela.
  if (diaDaSemana(ano, mes, dia) === 0) {
    dia = dia + 1 <= total ? dia + 1 : dia - 1;
  }

  const data = iso(ano, mes, dia);
  return naoVale(data) ? [] : [data];
}

/** Chave de "já foi feito", usada para casar item + ocorrência. */
export function chaveFeito(itemId: string, dataISO: string): string {
  return `${itemId}|${dataISO}`;
}

export interface Atraso {
  itemId: string;
  data: string;
  /** Dias corridos desde o vencimento. */
  diasDeAtraso: number;
}

/**
 * Ocorrências que já venceram e ninguém marcou como feitas.
 *
 * A que cai HOJE não entra: ainda dá tempo. Olha alguns meses para trás porque
 * um item trimestral pode ter vencido bem antes do mês corrente.
 */
export function ocorrenciasAtrasadas(
  itens: ItemAgendaCalc[],
  feitos: Set<string>,
  hojeISO: string,
  mesesParaTras = 12,
): Atraso[] {
  const [anoHoje, mesHoje] = hojeISO.split('-').map(Number);
  const atrasos: Atraso[] = [];

  for (let voltar = mesesParaTras; voltar >= 0; voltar--) {
    const bruto = mesHoje - voltar;
    const ano = anoHoje + Math.floor((bruto - 1) / 12);
    const mes = ((bruto - 1 + 12 * 100) % 12) + 1;

    for (const item of itens) {
      for (const data of ocorrenciasNoMes(item, mes, ano)) {
        if (data >= hojeISO) continue;
        if (feitos.has(chaveFeito(item.id, data))) continue;
        atrasos.push({ itemId: item.id, data, diasDeAtraso: diferencaEmDias(data, hojeISO) });
      }
    }
  }

  return atrasos.sort((a, b) => a.data.localeCompare(b.data));
}

export interface AtrasoAgrupado {
  itemId: string;
  /** A ocorrência vencida mais antiga. */
  desde: string;
  quantidade: number;
  datas: string[];
  /** Dias corridos desde a ocorrência mais antiga. */
  diasDeAtraso: number;
}

/**
 * Junta os atrasos por processo.
 *
 * Sem isso, um item mensal que ficou meses sem marcar produz uma linha por mês
 * — "Fechar caixa do mês" oito vezes seguidas. Ninguém precisa dessa lista: o
 * que importa é que aquele processo está atrasado e desde quando.
 */
export function agruparAtrasos(atrasos: Atraso[]): AtrasoAgrupado[] {
  const porItem = new Map<string, string[]>();
  for (const a of atrasos) {
    if (!porItem.has(a.itemId)) porItem.set(a.itemId, []);
    porItem.get(a.itemId)!.push(a.data);
  }

  return [...porItem.entries()]
    .map(([itemId, datas]) => {
      const ordenadas = [...datas].sort();
      const desde = ordenadas[0];
      return {
        itemId,
        desde,
        quantidade: ordenadas.length,
        datas: ordenadas,
        diasDeAtraso: atrasos.find((a) => a.itemId === itemId && a.data === desde)!.diasDeAtraso,
      };
    })
    .sort((a, b) => a.desde.localeCompare(b.desde));
}

/** Dias corridos entre duas datas YYYY-MM-DD (b - a). */
export function diferencaEmDias(a: string, b: string): number {
  const [aa, am, ad] = a.split('-').map(Number);
  const [ba, bm, bd] = b.split('-').map(Number);
  const ms = Date.UTC(ba, bm - 1, bd) - Date.UTC(aa, am - 1, ad);
  return Math.round(ms / 86_400_000);
}

/** "Toda segunda", "Dia 5 de todo mês", "Dia 10, a cada 4 meses (jan, mai, set)". */
const ORDINAIS_SEMANA: Record<number, string> = {
  1: 'primeira', 2: 'segunda', 3: 'terceira', 4: 'quarta', [-1]: 'última',
};

export function rotuloFrequencia(item: ItemAgendaCalc): string {
  if (item.frequencia === 'DIARIA') return 'Todo dia (seg a sáb)';

  if (item.frequencia === 'SEMANAL') {
    return item.diaSemana == null ? 'Semanal' : `Toda ${NOMES_DIA_SEMANA[item.diaSemana]}`;
  }

  if (item.frequencia === 'MENSAL_SEMANA') {
    if (item.diaSemana == null || item.semanaDoMes == null) return 'Uma vez por mês';
    const ordinal = ORDINAIS_SEMANA[item.semanaDoMes] ?? 'primeira';
    const dia = NOMES_DIA_SEMANA[item.diaSemana];
    const base = `${ordinal.charAt(0).toUpperCase()}${ordinal.slice(1)} ${dia} do mês`;
    const intervalo = Math.max(1, item.intervaloMeses || 1);
    return intervalo === 1 ? base : `${base}, a cada ${intervalo} meses`;
  }

  const dia = item.diaMes ?? 1;
  const intervalo = Math.max(1, item.intervaloMeses || 1);
  if (intervalo === 1) return `Dia ${dia} de todo mês`;
  if (intervalo === 12) {
    const mes = NOMES_MES[(item.mesBase ?? 1) - 1];
    return `Dia ${dia} de ${mes}, uma vez por ano`;
  }

  const base = item.mesBase ?? 1;
  const meses: string[] = [];
  for (let m = 1; m <= 12; m++) {
    if ((((m - base) % intervalo) + intervalo) % intervalo === 0) meses.push(NOMES_MES[m - 1].slice(0, 3));
  }
  return `Dia ${dia}, a cada ${intervalo} meses (${meses.join(', ')})`;
}
