// Datas do "hoje" sempre no fuso de Brasília.
//
// O servidor (Vercel) roda em UTC. Como o código monta datas com
// `new Date('YYYY-MM-DDT00:00:00')` (interpretado no fuso do servidor) e
// compara com `new Date()`, a partir das 21h de Brasília o servidor já
// considera que virou o dia seguinte — e o dia de amanhã entrava nos
// cálculos como "dia útil sem checklist = 0%". Tudo que precisa saber que
// dia é hoje deve usar este helper.

const FUSO = 'America/Sao_Paulo';

/** Data de hoje em Brasília, no formato YYYY-MM-DD. */
export function hojeISOSaoPaulo(agora: Date = new Date()): string {
  // 'en-CA' formata como YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora);
}

/** Meia-noite de hoje (Brasília) como Date no fuso do runtime — para comparações de dia. */
export function inicioDeHojeSaoPaulo(agora: Date = new Date()): Date {
  return new Date(`${hojeISOSaoPaulo(agora)}T00:00:00`);
}

/**
 * Dia do mês em que se encerra o fechamento do mês anterior.
 * Regra da agência: o mês anterior é validado até o dia 9 do mês seguinte.
 */
export const DIA_LIMITE_FECHAMENTO = 9;

/**
 * Primeiro dia (YYYY-MM-DD) que ainda aceita preencher ou editar checklist.
 *
 * Do dia 1 ao 9, o mês anterior segue aberto para o fechamento — os dois meses
 * aceitam edição. A partir do dia 10, só o mês corrente. Sem isso, qualquer mês
 * antigo continuava editável e a nota de um mês já pago podia mudar sozinha.
 */
export function inicioPeriodoEditavel(hojeISO: string = hojeISOSaoPaulo()): string {
  const [ano, mes, dia] = hojeISO.split('-').map(Number);
  const abriu = dia > DIA_LIMITE_FECHAMENTO
    ? { ano, mes }
    : { ano: mes === 1 ? ano - 1 : ano, mes: mes === 1 ? 12 : mes - 1 };
  return `${abriu.ano}-${String(abriu.mes).padStart(2, '0')}-01`;
}

/** true se a data (YYYY-MM-DD) é de um dia que ainda não aconteceu. */
export function ehDataFutura(dataISO: string, hojeISO: string = hojeISOSaoPaulo()): boolean {
  return dataISO > hojeISO;
}

/**
 * true se a data (YYYY-MM-DD) aceita preenchimento ou edição.
 *
 * Fecha dos dois lados: mês já apurado não muda mais, e dia que ainda não
 * aconteceu não pode ser dado como conferido.
 */
export function podeEditarChecklist(
  dataISO: string,
  hojeISO: string = hojeISOSaoPaulo(),
): boolean {
  if (ehDataFutura(dataISO, hojeISO)) return false;
  // Datas no formato YYYY-MM-DD comparam corretamente como texto.
  return dataISO >= inicioPeriodoEditavel(hojeISO);
}
