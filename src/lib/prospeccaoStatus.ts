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

// ─── O QUE AINDA PEDE AÇÃO ───
//
// A lista da tela abre só com o que não terminou. O status já diz isso: marcar
// "Fechado" ou "Não tem interesse" é justamente encerrar o assunto — por isso
// não existe um botão de arquivar, que seria um segundo lugar para dizer o
// mesmo e mais uma coisa para a equipe lembrar de fazer.

/**
 * Por quantos dias uma prospecção "Sem retorno" continua na lista.
 *
 * Contados de quando o status foi marcado (`updatedAt`), não da data da
 * prospecção: o status pode ter sido posto bem depois do primeiro contato, e o
 * que importa é há quanto tempo ela está parada assim.
 */
export const DIAS_SEM_RETORNO_NA_LISTA = 30;

/**
 * Todo status, classificado. O tipo `Record` é de propósito: se um status novo
 * entrar em `StatusProspeccaoTexto` e ninguém disser o que ele é, o build para.
 */
export const CLASSIFICACAO: Record<StatusProspeccaoTexto, 'aberto' | 'encerrado' | 'temporario'> = {
  NOVO: 'aberto',
  CONTATO: 'aberto',
  SEM_RETORNO: 'temporario', // sai da lista sozinho depois de DIAS_SEM_RETORNO_NA_LISTA
  FECHADO: 'encerrado',
  NAO_TEM_INTERESSE: 'encerrado',
  SEM_PERFIL: 'encerrado',
  DADOS_INCORRETO: 'encerrado',
};

const porClasse = (classe: 'aberto' | 'encerrado' | 'temporario') =>
  (Object.keys(CLASSIFICACAO) as StatusProspeccaoTexto[]).filter((s) => CLASSIFICACAO[s] === classe);

/** Sempre na lista. */
export const STATUS_ABERTOS = porClasse('aberto');
/** Nunca na lista. */
export const STATUS_ENCERRADOS = porClasse('encerrado');

/** O que a lista mostra: o que pede ação, tudo, ou um status específico. */
export type EscopoProspeccao = 'aberto' | 'todas' | StatusProspeccaoTexto;
