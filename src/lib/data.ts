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
