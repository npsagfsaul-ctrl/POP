// Rótulos em português dos status de Prospecção — usados tanto na tela
// (ProspeccaoManager) quanto na exportação (para o texto bater nos dois lugares).

export type StatusProspeccaoTexto =
  | 'CONTATO'
  | 'FECHADO'
  | 'SEM_RETORNO'
  | 'NAO_TEM_INTERESSE'
  | 'SEM_PERFIL'
  | 'DADOS_INCORRETO';

export const STATUS_PROSPECCAO_LABEL: Record<StatusProspeccaoTexto, string> = {
  CONTATO: 'Em contato',
  FECHADO: 'Fechado',
  SEM_RETORNO: 'Sem retorno',
  NAO_TEM_INTERESSE: 'Não tem interesse',
  SEM_PERFIL: 'Sem perfil',
  DADOS_INCORRETO: 'Dados incorretos',
};
