// Rótulos em português dos status de Coleta — usados na tela do dia,
// no histórico e na exportação, para o texto nunca divergir.

export type StatusColetaTexto = 'AGUARDANDO' | 'COLETADO' | 'CANCELADO';

export const STATUS_COLETA_LABEL: Record<StatusColetaTexto, string> = {
  AGUARDANDO: 'Aguardando',
  COLETADO: 'Coletado',
  CANCELADO: 'Cancelada',
};

export const DIAS_SEMANA_LABEL: Record<number, string> = {
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
};

/** Formata a lista de dias de uma rota fixa (ex.: [1..6] → "Todos os dias (Seg–Sáb)"). */
export function formatarDias(dias: number[]): string {
  if (dias.length >= 6) return 'Todos os dias (Seg–Sáb)';
  return dias
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DIAS_SEMANA_LABEL[d] ?? String(d))
    .join(', ');
}
