// Rótulos em português dos status de Prospecção — usados tanto na tela
// (ProspeccaoManager) quanto na exportação (para o texto bater nos dois lugares).

export type StatusProspeccaoTexto =
  | 'NOVO'
  | 'CONTATO'
  | 'FECHADO'
  | 'SEM_RETORNO'
  | 'NAO_TEM_INTERESSE'
  | 'SEM_PERFIL'
  | 'DADOS_INCORRETO';

// A ordem daqui é a que aparece nos cartões de resumo, no filtro e no formulário.
export const STATUS_PROSPECCAO_LABEL: Record<StatusProspeccaoTexto, string> = {
  NOVO: 'Novo',
  CONTATO: 'Em contato',
  FECHADO: 'Fechado',
  SEM_RETORNO: 'Sem retorno',
  NAO_TEM_INTERESSE: 'Não tem interesse',
  SEM_PERFIL: 'Sem perfil',
  DADOS_INCORRETO: 'Dados incorretos',
};
