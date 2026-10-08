/**
 * Horas de banco guardadas em MINUTOS inteiros, com sinal.
 *
 * Minuto e não "horas decimais" porque 03:47 em decimal é 3,7833… — some um
 * pedacinho a cada conta, e saldo de hora é coisa que a pessoa confere batendo
 * com o relatório do ponto. Em minuto, a conta fecha exata.
 *
 * Negativo = o colaborador deve horas. Positivo = tem horas a receber.
 */

/** "03:47" → 227. Aceita "3:47" e o sinal na frente: "-03:47". */
export function parseHoras(texto: string): number | null {
  const limpo = texto.trim();
  if (!limpo) return null;

  const m = limpo.match(/^([+-]?)(\d{1,3}):([0-5]\d)$/);
  if (!m) return null;

  const [, sinal, horas, minutos] = m;
  const total = Number(horas) * 60 + Number(minutos);
  return sinal === '-' ? -total : total;
}

/**
 * 227 → "03:47". Sempre com duas casas na hora, como no relatório do ponto.
 * `comSinal` põe o "+" no positivo, para a lista de saldos não deixar dúvida.
 */
export function formatarHoras(minutos: number, comSinal = false): string {
  const negativo = minutos < 0;
  const abs = Math.abs(minutos);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const corpo = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  if (negativo) return `-${corpo}`;
  return comSinal && minutos > 0 ? `+${corpo}` : corpo;
}

/**
 * O saldo é o que veio do relatório oficial mais o que foi lançado aqui.
 *
 * O saldo inicial é digitado, copiado do sistema de ponto, de propósito: o
 * ponto é o registro que vale, e refazer a conta dele aqui criaria dois
 * números para a mesma coisa. O Portal continua a conta, não a refaz.
 */
export function saldoDe(saldoInicialMinutos: number, lancamentos: { minutos: number }[]): number {
  return lancamentos.reduce((total, l) => total + l.minutos, saldoInicialMinutos);
}
