'use server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { isAdmin } from './admin';
import { getSetorColetas } from './coletasAcesso';

const CHAVE_SETOR = 'comercial_setor_id';
const CHAVE_SETOR_LEITURA = 'comercial_leitura_setor_id';

/**
 * O que a pessoa pode fazer no Comercial.
 *
 * `editar` é do Comercial, que cadastra; `ver` é do Atendimento Interno, que
 * consulta o ID e a senha do cliente na hora de postar mas não mexe no
 * cadastro; `null` é quem ainda não entrou.
 */
export type NivelComercial = 'editar' | 'ver' | null;

async function buscarSetor(chaveConfig: string, pedacoDoNome: string) {
  const cfg = await prisma.config.findUnique({ where: { chave: chaveConfig } });
  const valor = cfg?.valor?.trim();
  if (valor) {
    const porId = await prisma.setor.findUnique({
      where: { id: valor },
      select: { id: true, nome: true, senha: true },
    });
    if (porId) return porId;
  }

  return prisma.setor.findFirst({
    where: { nome: { contains: pedacoDoNome } },
    select: { id: true, nome: true, senha: true },
  });
}

/**
 * O setor dono da área Comercial.
 *
 * Guardado em Config para sobreviver a renomear o setor. Sem nada configurado,
 * procura pelo nome — assim a área funciona desde o primeiro dia, sem exigir
 * que alguém preencha uma configuração antes.
 */
export async function getSetorComercial(): Promise<{ id: string; nome: string } | null> {
  const setor = await buscarSetor(CHAVE_SETOR, 'omercial');
  return setor ? { id: setor.id, nome: setor.nome } : null;
}

/**
 * O setor que só consulta o cadastro: o Atendimento Interno.
 *
 * Se ninguém configurou, procura pelo nome e, por último, usa o setor já
 * apontado como responsável pelas Coletas — que é o mesmo Atendimento Interno.
 */
async function getSetorLeitura() {
  const porNome = await buscarSetor(CHAVE_SETOR_LEITURA, 'nterno');
  if (porNome) return porNome;

  const idColetas = await getSetorColetas();
  if (!idColetas) return null;

  return prisma.setor.findUnique({
    where: { id: idColetas },
    select: { id: true, nome: true, senha: true },
  });
}

/**
 * Os dois setores da porta de entrada, com o aviso de quem está sem senha.
 *
 * Setor sem senha não entra na lista de opções: a ficha do cliente guarda a
 * senha do ID Correios dele, e sem senha de setor isso ficaria à vista de
 * qualquer pessoa logada no sistema.
 */
export async function setoresDoComercial() {
  const [comercial, leitura] = await Promise.all([
    buscarSetor(CHAVE_SETOR, 'omercial'),
    getSetorLeitura(),
  ]);

  const resumo = (s: { id: string; nome: string; senha: string | null } | null) =>
    s ? { id: s.id, nome: s.nome, temSenha: !!s.senha } : null;

  return { comercial: resumo(comercial), leitura: resumo(leitura) };
}

/** O que esta pessoa pode fazer no Comercial agora. */
export async function nivelComercial(): Promise<NivelComercial> {
  if (await isAdmin()) return 'editar';

  const cookieStore = await cookies();
  // Lê o cookie direto, e não `podeEscreverNoSetor`, porque aqui importa POR
  // QUAL setor a pessoa entrou — é isso que separa quem edita de quem só olha.
  const entrouNo = (id: string) => cookieStore.has(`auth_setor_${id}`);

  const { comercial, leitura } = await setoresDoComercial();
  if (comercial && entrouNo(comercial.id)) return 'editar';
  if (leitura && entrouNo(leitura.id)) return 'ver';
  return null;
}

/** true quando a pessoa pode mexer no cadastro (Comercial ou admin). */
export async function podeEditarComercial(): Promise<boolean> {
  return (await nivelComercial()) === 'editar';
}
