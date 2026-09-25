'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { TipoCliente } from '@prisma/client';
import { podeUsarComercial } from './comercialAcesso';

export async function getClientes(apenasAtivos = false) {
  return prisma.cliente.findMany({
    where: apenasAtivos ? { ativo: true } : undefined,
    orderBy: { nome: 'asc' },
  });
}

export async function getClientePorId(id: string) {
  return prisma.cliente.findUnique({ where: { id } });
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
            { telefone: { contains: t, mode: 'insensitive' as const } },
            { idCorreios: { contains: t, mode: 'insensitive' as const } },
            { cidade: { contains: t, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  return prisma.cliente.findMany({ where, orderBy: { nome: 'asc' }, take: 200 });
}

const CAMPOS_TEXTO = [
  'codigo', 'nomeFantasia', 'documento', 'inscricaoEstadual', 'idCorreios',
  'responsavel', 'telefone', 'email',
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
 * Cadastrar e alterar cliente é do Comercial (ou do admin).
 *
 * A checagem fica aqui e não só na tela: Server Action é endereço público, e
 * esconder o botão não impede ninguém de chamar a função.
 */
async function exigirComercial() {
  if (!(await podeUsarComercial())) {
    throw new Error('Só o setor Comercial pode mexer no cadastro de clientes.');
  }
}

function revalidar() {
  revalidatePath('/comercial');
  revalidatePath('/coletas/cadastros');
  revalidatePath('/coletas');
}

export async function criarCliente(formData: FormData) {
  await exigirComercial();
  const dados = dadosDoFormulario(formData, true) as { nome: string };
  const cliente = await prisma.cliente.create({ data: dados });
  revalidar();
  return cliente.id;
}

export async function atualizarCliente(id: string, formData: FormData) {
  await exigirComercial();
  await prisma.cliente.update({ where: { id }, data: dadosDoFormulario(formData, false) });
  revalidar();
}

export async function alternarClienteAtivo(id: string, ativo: boolean) {
  await exigirComercial();
  await prisma.cliente.update({ where: { id }, data: { ativo } });
  revalidar();
}

export async function deletarCliente(id: string) {
  await exigirComercial();
  try {
    await prisma.cliente.delete({ where: { id } });
  } catch {
    throw new Error('Não dá para excluir: este cliente já tem coletas ou rotas fixas registradas. Use "Desativar".');
  }
  revalidar();
}
