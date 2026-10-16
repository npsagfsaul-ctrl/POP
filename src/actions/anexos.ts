'use server';

import { put, del } from '@vercel/blob';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { podeEditarComercial } from './comercialAcesso';

/** Limite por arquivo. Fica aqui, no servidor, porque é ele quem decide de
 *  verdade — a checagem na tela é só para avisar antes de subir. */
export const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/** Imagens e PDF. A tela aceita os mesmos; quem contorna o <input> esbarra aqui. */
export const TIPOS_ACEITOS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

async function exigirComercial() {
  if (!(await podeEditarComercial())) {
    throw new Error('Só o setor Comercial pode anexar ou remover arquivos.');
  }
}

export async function adicionarAnexo(clienteId: string, formData: FormData) {
  await exigirComercial();

  const arquivo = formData.get('arquivo');
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    throw new Error('Nenhum arquivo selecionado.');
  }
  if (arquivo.size > MAX_BYTES) {
    throw new Error('Arquivo acima de 5 MB. Reduza ou comprima antes de anexar.');
  }
  if (!TIPOS_ACEITOS.includes(arquivo.type)) {
    throw new Error('Só dá para anexar imagem (JPG, PNG, WebP, GIF) ou PDF.');
  }

  // addRandomSuffix deixa a URL impossível de adivinhar e evita que dois
  // arquivos de mesmo nome se sobrescrevam.
  const blob = await put(`clientes/${clienteId}/${arquivo.name}`, arquivo, {
    access: 'public',
    addRandomSuffix: true,
  });

  await prisma.anexo.create({
    data: {
      clienteId,
      url: blob.url,
      nome: arquivo.name,
      tipo: arquivo.type,
      tamanho: arquivo.size,
    },
  });

  revalidatePath(`/comercial/${clienteId}`);
}

export async function removerAnexo(id: string) {
  await exigirComercial();

  const anexo = await prisma.anexo.findUnique({ where: { id } });
  if (!anexo) return;

  // Apaga o arquivo no Blob antes da linha no banco. Se o Blob falhar, a linha
  // fica — melhor um registro órfão do que um arquivo pago e esquecido.
  await del(anexo.url);
  await prisma.anexo.delete({ where: { id } });

  revalidatePath(`/comercial/${anexo.clienteId}`);
}
