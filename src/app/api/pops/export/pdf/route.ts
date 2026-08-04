import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/actions/admin';
import { podeVerSetor } from '@/actions/setorAcesso';
import { normalizarQuebrasDeLinha } from '@/lib/texto';
import { hojeISOSaoPaulo } from '@/lib/data';
import { ordenarPops } from '@/lib/pops';
import PDFDocument from 'pdfkit';

/**
 * GET /api/pops/export/pdf?setorId=XXX — PDF com os POPs de um setor
 * GET /api/pops/export/pdf?todos=1     — PDF com todos os setores, um por página
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const todos = params.get('todos') === '1';
  const setorId = params.get('setorId');

  if (!todos && !setorId) {
    return new NextResponse('Informe setorId ou todos=1.', { status: 400 });
  }

  const setores = todos
    ? await prisma.setor.findMany({ orderBy: { nome: 'asc' } })
    : [await prisma.setor.findUnique({ where: { id: setorId! } })].filter((s) => s !== null);

  if (setores.length === 0) {
    return new NextResponse('Setor não encontrado.', { status: 404 });
  }

  // Todos os setores num arquivo: admin. Um setor só: quem tem acesso a ele.
  const autorizado = todos ? await isAdmin() : await podeVerSetor(setores[0]!.id);
  if (!autorizado) {
    return new NextResponse('Não autorizado', { status: 403 });
  }

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const chunks: Uint8Array[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const finished = new Promise<void>((resolve) => doc.on('end', () => resolve()));

  const emitidoEm = new Date().toLocaleDateString('pt-BR');

  for (let s = 0; s < setores.length; s++) {
    const setor = setores[s]!;
    // Cada setor começa numa página nova, para poder entregar separado.
    if (s > 0) doc.addPage();

    const pops = ordenarPops(await prisma.pop.findMany({ where: { setorId: setor.id } }));
    const ativos = pops.filter((p) => !p.desativadoEm);

    doc.fontSize(20).fillColor('#111').text('Relatório de POPs Cadastrados', { align: 'center' });
    doc.fontSize(13).fillColor('#555').text(setor.nome, { align: 'center' });
    doc.moveDown();
    doc.fontSize(9).fillColor('#888').text(
      `Emitido em ${emitidoEm} · ${ativos.length} POP(s) ativo(s)`,
      { align: 'center' },
    );
    doc.moveDown(1.5);

    if (pops.length === 0) {
      doc.fontSize(12).fillColor('#555').text('Nenhum POP cadastrado neste setor.');
      continue;
    }

    pops.forEach((pop) => {
      if (doc.y > 700) doc.addPage();

      // Sem numeração automática: o número já vem no título, escrito pela
      // usuária. Antes saía "21. 21. Conferir malote".
      const desativado = !!pop.desativadoEm;
      doc.fontSize(13).fillColor(desativado ? '#999' : '#111')
        .text(`${normalizarQuebrasDeLinha(pop.titulo)}${desativado ? '  (desativado)' : ''}`);
      doc.fontSize(10).fillColor('#555').text(`Peso: ${pop.peso}`);
      doc.fontSize(10).fillColor('#333').text('Orientação de Avaliação: ', { continued: true })
        .fillColor('#555').text(normalizarQuebrasDeLinha(pop.orientacaoAvaliacao));
      doc.fontSize(10).fillColor('#333').text('Instrução de Trabalho: ', { continued: true })
        .fillColor('#555').text(normalizarQuebrasDeLinha(pop.instrucaoTrabalho));
      doc.moveDown();
    });
  }

  doc.end();
  await finished;

  const pdfBuffer = Buffer.concat(chunks);
  const hoje = hojeISOSaoPaulo();
  const nomeArquivo = todos
    ? `pops_todos_os_setores_${hoje}.pdf`
    : `pops_${setores[0]!.nome.replace(/[^a-zA-Z0-9]+/g, '_')}_${hoje}.pdf`;

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
    },
  });
}
