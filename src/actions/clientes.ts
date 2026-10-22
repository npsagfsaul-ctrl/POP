'use server';

import { prisma } from '@/lib/prisma';
import { TipoCliente } from '@prisma/client';
import { podeEditarComercial } from './comercialAcesso';

export async function getClientes(apenasAtivos = false) {
  return prisma.cliente.findMany({
    where: apenasAtivos ? { ativo: true } : undefined,
    orderBy: { nome: 'asc' },
  });
}

export async function getClientePorId(id: string) {
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      idsCorreios: { orderBy: { createdAt: 'asc' } },
      anexos: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!cliente) return null;

  return { ...cliente, idsCorreios: juntarComOIdAntigo(cliente) };
}

/**
 * A lista de IDs do cliente, com o campo único antigo incluído.
 *
 * Só junta, não grava: quem tiver preenchido `idCorreios` antes da lista
 * existir vê o número na tela normalmente e, ao salvar a ficha, ele vira uma
 * linha de verdade. Como a junção confere se o número já está na lista, não
 * duplica depois disso.
 */
function juntarComOIdAntigo(cliente: {
  idCorreios: string | null;
  idsCorreios: { numero: string; apelido: string | null; senha: string | null }[];
}) {
  const lista = cliente.idsCorreios.map((i) => ({
    numero: i.numero,
    apelido: i.apelido,
    senha: i.senha,
  }));

  const antigo = cliente.idCorreios?.trim();
  const jaEstaNaLista = antigo && lista.some((i) => i.numero === antigo);

  return antigo && !jaEstaNaLista
    ? [{ numero: antigo, apelido: null, senha: null }, ...lista]
    : lista;
}

/**
 * Busca por nome, nome fantasia, código, documento, telefone ou ID Correios.
 *
 * São mais de 300 clientes: sem busca, achar um na lista é rolar até cansar.
 */
export async function buscarClientes(termo: string, apenasAtivos = false) {
  const t = termo.trim();
  const where = {
    ...(apenasAtivos ? { ativo: true } : {}),
    ...(t
      ? {
          OR: [
            { nome: { contains: t, mode: 'insensitive' as const } },
            { nomeFantasia: { contains: t, mode: 'insensitive' as const } },
            { codigo: { contains: t, mode: 'insensitive' as const } },
            { documento: { contains: t, mode: 'insensitive' as const } },
            { cpfResponsavel: { contains: t, mode: 'insensitive' as const } },
            { rgResponsavel: { contains: t, mode: 'insensitive' as const } },
            { responsavel: { contains: t, mode: 'insensitive' as const } },
            { contatoNome: { contains: t, mode: 'insensitive' as const } },
            { telefone: { contains: t, mode: 'insensitive' as const } },
            { idCorreios: { contains: t, mode: 'insensitive' as const } },
            { idsCorreios: { some: { numero: { contains: t, mode: 'insensitive' as const } } } },
            { cidade: { contains: t, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  return prisma.cliente.findMany({ where, orderBy: { nome: 'asc' }, take: 200 });
}

// `idCorreios` ficou de fora: os IDs viraram lista, gravada por
// `sincronizarIdsCorreios`. O campo antigo não recebe valor novo.
const CAMPOS_TEXTO = [
  'codigo', 'nomeFantasia', 'documento', 'inscricaoEstadual',
  'responsavel', 'cpfResponsavel', 'rgResponsavel', 'nascimentoResponsavel',
  'nomeMaeResponsavel', 'contatoNome', 'telefone', 'email',
  'cep', 'rua', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'observacao',
] as const;

/**
 * Lê do formulário SÓ os campos que ele enviou.
 *
 * A tela de Cadastros das Coletas edita cliente com nome e código apenas. Se
 * aqui montasse o objeto inteiro, salvar por lá apagaria CNPJ, telefone e
 * endereço que o Comercial tinha preenchido.
 */
function dadosDoFormulario(formData: FormData, exigirNome: boolean) {
  const dados: Record<string, string | null> = {};

  if (formData.has('nome')) {
    const nome = (formData.get('nome') as string)?.trim();
    if (!nome) throw new Error('A razão social (ou o nome) é obrigatória.');
    dados.nome = nome;
  } else if (exigirNome) {
    throw new Error('A razão social (ou o nome) é obrigatória.');
  }

  if (formData.has('tipo')) {
    dados.tipo = (formData.get('tipo') as string) === 'PF' ? 'PF' : 'PJ';
  }

  for (const campo of CAMPOS_TEXTO) {
    if (!formData.has(campo)) continue;
    const valor = ((formData.get(campo) as string) || '').trim() || null;
    dados[campo] = campo === 'uf' ? valor?.toUpperCase() ?? null : valor;
  }

  return dados as { nome?: string; tipo?: TipoCliente } & Record<string, string | null>;
}

/**
 * Cadastrar e alterar cliente é do Comercial (ou do admin). O Atendimento
 * Interno entra na área, mas só para consultar.
 *
 * A checagem fica aqui e não só na tela: Server Action é endereço público, e
 * esconder o botão não impede ninguém de chamar a função.
 */
async function exigirComercial() {
  if (!(await podeEditarComercial())) {
    throw new Error('Só o setor Comercial pode mexer no cadastro de clientes.');
  }
}

/**
 * Não revalida nada, de propósito — e isso é o conserto de um erro real.
 *
 * As três telas que estavam aqui (`/comercial`, `/coletas`,
 * `/coletas/cadastros`) são todas `force-dynamic`: já são refeitas a cada
 * acesso, então mandar revalidar não mudava nada. Em compensação, revalidar
 * durante uma Server Action faz o Next RE-RENDERIZAR essas rotas dentro da
 * resposta da ação. Qualquer erro num desses renders derruba a resposta
 * inteira — e o cadastro, que tinha gravado certinho, voltava para a tela como
 * "An error occurred in the Server Components render", sem dizer de onde veio.
 *
 * Quem chama já faz `router.refresh()` na volta, que é o que de fato atualiza
 * a tela de quem está ali. Mantido como função vazia para o dia em que entrar
 * uma rota com cache de verdade, e para este comentário não se perder.
 */
function revalidar() {
  // intencionalmente vazio — veja o comentário acima
}

/**
 * Regrava a lista de IDs Correios do cliente com o que o formulário mandou.
 *
 * Só age se o formulário disser que mexeu nos IDs — a tela de Cadastros das
 * Coletas não tem esse campo, e sem a marca ela apagaria a lista inteira ao
 * salvar nome e código.
 *
 * Apaga e recria em vez de casar linha por linha: ninguém aponta para um ID,
 * então a lista é só o que a tela mostra.
 */
async function sincronizarIdsCorreios(clienteId: string, formData: FormData) {
  if (!formData.has('idsCorreiosEnviados')) return;

  const numeros = formData.getAll('idNumero').map((v) => String(v).trim());
  const apelidos = formData.getAll('idApelido').map((v) => String(v).trim());
  // A senha não leva trim: espaço no começo ou no fim pode fazer parte dela.
  const senhas = formData.getAll('idSenha').map((v) => String(v));

  const linhas = numeros
    .map((numero, i) => ({
      clienteId,
      numero,
      apelido: apelidos[i] || null,
      senha: senhas[i] || null,
    }))
    .filter((l) => l.numero !== '');

  await prisma.$transaction([
    prisma.idCorreios.deleteMany({ where: { clienteId } }),
    ...(linhas.length ? [prisma.idCorreios.createMany({ data: linhas })] : []),
    // O campo antigo some assim que a lista é gravada: daí em diante existe
    // um lugar só onde procurar o ID do cliente.
    prisma.cliente.update({ where: { id: clienteId }, data: { idCorreios: null } }),
  ]);
}

/**
 * Devolve o erro em vez de deixá-lo subir — para a pessoa poder LER o que
 * houve.
 *
 * O Next apaga a mensagem de qualquer erro que escape de uma Server Action em
 * produção e manda no lugar um texto genérico em inglês sobre "Server
 * Components render". Resultado: todo aviso escrito aqui ("a razão social é
 * obrigatória", "este cliente já tem coletas") chegava ilegível na tela, e um
 * problema de banco chegava idêntico a um erro de preenchimento.
 *
 * Capturando aqui, a mensagem volta como dado comum e a tela a mostra inteira.
 */
export interface Resultado {
  erro?: string;
  id?: string;
}

function comoErro(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  return 'Não foi possível salvar. Tente de novo em instantes.';
}

export async function criarCliente(formData: FormData): Promise<Resultado> {
  try {
    await exigirComercial();
    const dados = dadosDoFormulario(formData, true) as { nome: string };
    const cliente = await prisma.cliente.create({ data: dados });
    await sincronizarIdsCorreios(cliente.id, formData);
    revalidar();
    return { id: cliente.id };
  } catch (e) {
    return { erro: comoErro(e) };
  }
}

export async function atualizarCliente(id: string, formData: FormData): Promise<Resultado> {
  try {
    await exigirComercial();
    await prisma.cliente.update({ where: { id }, data: dadosDoFormulario(formData, false) });
    await sincronizarIdsCorreios(id, formData);
    revalidar();
    return { id };
  } catch (e) {
    return { erro: comoErro(e) };
  }
}

export async function alternarClienteAtivo(id: string, ativo: boolean) {
  await exigirComercial();
  await prisma.cliente.update({ where: { id }, data: { ativo } });
  revalidar();
}

export async function deletarCliente(id: string) {
  await exigirComercial();

  // Pega as URLs antes de apagar: o cliente sai com os anexos por cascade, e
  // depois não haveria mais como saber quais arquivos limpar no Blob.
  const anexos = await prisma.anexo.findMany({ where: { clienteId: id }, select: { url: true } });

  try {
    await prisma.cliente.delete({ where: { id } });
  } catch {
    throw new Error('Não dá para excluir: este cliente já tem coletas ou rotas fixas registradas. Use "Desativar".');
  }

  // Lixo pago não deve ficar para trás; se a limpeza falhar, o cadastro já foi.
  if (anexos.length) {
    /*
      O pacote do Blob é carregado AQUI, e não no topo do arquivo.

      Este arquivo é o do cadastro de cliente — a parte mais usada do
      Comercial. Carregar o Blob lá em cima amarrava o cadastro inteiro a um
      serviço que nem está configurado (o diagnóstico mostrou "Vercel Blob
      configurado: NÃO"), e o cadastro parou de funcionar na mesma data em que
      esse import entrou. Carregado aqui dentro, só quem exclui cliente com
      anexo depende dele — e, se faltar, o cadastro segue inteiro.
    */
    try {
      const { del } = await import('@vercel/blob');
      await del(anexos.map((a) => a.url));
    } catch {}
  }

  revalidar();
}
