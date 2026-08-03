// Rótulos em português dos status de Coleta — usados na tela do dia,
// no histórico e na exportação, para o texto nunca divergir.

export type StatusColetaTexto = 'AGUARDANDO' | 'COLETADO' | 'CANCELADO';

export const STATUS_COLETA_LABEL: Record<StatusColetaTexto, string> = {
  AGUARDANDO: 'Aguardando',
  COLETADO: 'Coletado',
  CANCELADO: 'Cancelada',
};

// Até que horas o cliente pode pedir uma coleta extra em cada período.
// Definido com a operação: manhã até 09:00, tarde até 13:00.
// Os coletores entram às 08:00 — então a folha da manhã sempre sai antes do
// corte, e a extra que chega nessa janela só alcança o coletor pelo celular.
export const CORTE_PEDIDOS: Record<string, string> = {
  MANHA: '09:00',
  TARDE: '13:00',
  RETORNO: '',
};

/** true se o horário de corte daquele período já passou (na data de hoje). */
export function corteJaPassou(periodo: string, agora: Date, ehHoje: boolean): boolean {
  const corte = CORTE_PEDIDOS[periodo];
  if (!corte || !ehHoje) return false;
  const [h, m] = corte.split(':').map(Number);
  return agora.getHours() > h || (agora.getHours() === h && agora.getMinutes() >= m);
}

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
