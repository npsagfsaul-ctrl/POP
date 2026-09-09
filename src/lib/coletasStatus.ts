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
/**
 * Cores dos coletores.
 *
 * Antes cada coletor tinha uma cor escolhida à mão no cadastro, e o resultado
 * era o da planilha antiga: verde-limão ao lado de azul-marinho e rosa, sem
 * combinar. Agora a cor é atribuída pelo sistema a partir desta paleta — todas
 * na mesma faixa de escuridão, então o texto branco funciona em todas e a tela
 * fica uniforme.
 */
export const PALETA_COLETORES = [
  '#364FC7', // índigo
  '#0B7285', // ciano
  '#2B8A3E', // verde
  '#E67700', // âmbar
  '#C92A2A', // vermelho
  '#862E9C', // uva
  '#087F5B', // esmeralda
  '#D9480F', // laranja
  '#A61E4D', // framboesa
  '#5F3DC4', // violeta
] as const;

/**
 * A cor de um coletor, estável ao longo do tempo.
 *
 * A posição sai da ordem dos ids (que são sequenciais no tempo), então um
 * coletor novo entra no fim e não muda a cor de quem já estava — "o Neto é o
 * azul" continua valendo amanhã.
 */
export function corDoColetor(coletorId: string, idsConhecidos: string[]): string {
  const posicao = [...idsConhecidos].sort().indexOf(coletorId);
  return PALETA_COLETORES[(posicao < 0 ? 0 : posicao) % PALETA_COLETORES.length];
}

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
