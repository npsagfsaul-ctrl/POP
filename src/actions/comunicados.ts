'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { TipoComunicado } from '@prisma/client';
import { isAdmin } from './admin';
import { podeEscreverNoSetor } from './setorAcesso';

/**
 * Tamanho máximo da imagem já comprimida, em caracteres do data URI.
 * ~400 mil caracteres de base64 são ~300 KB de imagem — bem acima do que o
 * compressor do navegador costuma gerar, e bem abaixo do limite de corpo de
 * uma Server Action. Serve como rede de segurança, não como o alvo.
 */
const LIMITE_IMAGEM = 400_000;

export async function getComunicados(incluirExpirados = false) {
  const now = new Date();
  return await prisma.comunicado.findMany({
    where: incluirExpirados
      ? {}
      : {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } },
          ],
        },
    include: { setor: { select: { nome: true } } },
    orderBy: [
      { destaque: 'desc' },
      { createdAt: 'desc' },
    ],
  });
}

export async function getComunicadoById(id: string) {
  return await prisma.comunicado.findUnique({ where: { id } });
}

export async function criarComunicado(formData: FormData) {
  // Server Action é endpoint público: a checagem da página não protege esta
  // função, ela precisa se proteger sozinha.
  if (!(await isAdmin())) {
    throw new Error('Apenas o administrador pode publicar comunicados.');
  }

  const titulo = formData.get('titulo') as string;
  const conteudo = formData.get('conteudo') as string;
  const tipo = formData.get('tipo') as TipoComunicado;
  const destaque = formData.get('destaque') === 'on';
  const expiresAtRaw = formData.get('expiresAt') as string;

  if (!titulo || !conteudo) {
    throw new Error('Título e conteúdo são obrigatórios.');
  }

  await prisma.comunicado.create({
    data: {
      titulo,
      conteudo,
      tipo: tipo || 'AVISO',
      destaque,
      expiresAt: expiresAtRaw ? new Date(expiresAtRaw) : null,
    },
  });

  revalidatePath('/');
  revalidatePath('/admin/comunicados');
  redirect('/admin/comunicados');
}

/**
 * Informativo publicado pelo próprio setor, com a senha dele.
 *
 * Diferenças em relação ao comunicado da administração, todas impostas aqui e
 * não na tela: o autor fica registrado, o tipo é sempre informativo, e o
 * destaque (o fixado no topo do mural) continua exclusivo do admin — senão
 * todo setor se fixaria no topo e o destaque perderia a função.
 */
export async function publicarInformativoSetor(
  setorId: string,
  dados: { titulo: string; conteudo: string; validade?: string | null; imagem?: string | null },
) {
  if (!(await podeEscreverNoSetor(setorId))) {
    throw new Error('É preciso entrar com a senha do setor para publicar.');
  }

  const titulo = dados.titulo?.trim();
  const conteudo = dados.conteudo?.trim();
  if (!titulo || !conteudo) {
    throw new Error('Título e texto são obrigatórios.');
  }

  const imagem = dados.imagem?.trim() || null;
  if (imagem) {
    if (!imagem.startsWith('data:image/')) {
      throw new Error('Formato de imagem não reconhecido.');
    }
    if (imagem.length > LIMITE_IMAGEM) {
      throw new Error('A imagem ficou grande demais mesmo depois de comprimida. Tente uma foto menor.');
    }
  }

  await prisma.comunicado.create({
    data: {
      titulo,
      conteudo,
      tipo: 'INFO',
      destaque: false,
      expiresAt: dados.validade ? new Date(dados.validade) : null,
      setorId,
      imagem,
    },
  });

  revalidatePath('/');
  revalidatePath(`/setores/${setorId}`);
  revalidatePath('/admin/comunicados');
}

export async function deletarComunicado(id: string) {
  const comunicado = await prisma.comunicado.findUnique({
    where: { id },
    select: { setorId: true },
  });
  if (!comunicado) return;

  // O admin apaga qualquer um. O setor só apaga o que ele mesmo publicou.
  const permitido = comunicado.setorId
    ? await podeEscreverNoSetor(comunicado.setorId)
    : await isAdmin();

  if (!permitido) {
    throw new Error('Sem permissão para excluir este comunicado.');
  }

  await prisma.comunicado.delete({ where: { id } });
  revalidatePath('/');
  revalidatePath('/admin/comunicados');
  if (comunicado.setorId) revalidatePath(`/setores/${comunicado.setorId}`);
}
