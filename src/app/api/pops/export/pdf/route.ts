import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/actions/admin';
import { normalizarQuebrasDeLinha } from '@/lib/texto';
import { hojeISOSaoPaulo } from '@/lib/data';
import PDFDocument from 'pdfkit';

/** GET /api/pops/export/pdf?setorId=XXX — PDF com os POPs cadastrados de um setor */
export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return new NextResponse('Não autorizado', { status: 403 });
  }

  const setorId = new URL(request.url).searchParams.get('setorId');
  if (!setorId) {
    return new NextResponse('Parâmetro setorId é obrigatório.', { status: 400 });
  }

  const setor = await prisma.setor.findUnique({ where: { id: setorId } });
  if (!setor) {
    return new NextResponse('Setor não encontrado.', { status: 404 });
  }

  const pops = await prisma.pop.findMany({
    where: { setorId },
    orderBy: { createdAt: 'asc' },
  });

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const chunks: Uint8Array[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const finished = new Promise<void>((resolve) => doc.on('end', () => resolve()));

  doc.fontSize(20).fillColor('#111').text('Relatório de POPs Cadastrados', { align: 'center' });
  doc.fontSize(13).fillColor('#555').text(setor.nome, { align: 'center' });
  doc.moveDown();
  doc.fontSize(9).fillColor('#888').text(
    `Emitido em ${new Date().toLocaleDateString('pt-BR')} · ${pops.length} POP(s) cadastrado(s)`,
    { align: 'center' },
  );
  doc.moveDown(1.5);

  if (pops.length === 0) {
    doc.fontSize(12).fillColor('#555').text('Nenhum POP cadastrado neste setor.');
  }

  pops.forEach((pop, i) => {
    if (doc.y > 700) doc.addPage();

    doc.fontSize(13).fillColor('#111').text(`${i + 1}. ${normalizarQuebrasDeLinha(pop.titulo)}`, { continued: false });
    doc.fontSize(10).fillColor('#555').text(`Peso: ${pop.peso}`);
    doc.fontSize(10).fillColor('#333').text(`Orientação de Avaliação: `, { continued: true })
      .fillColor('#555').text(normalizarQuebrasDeLinha(pop.orientacaoAvaliacao));
    doc.fontSize(10).fillColor('#333').text(`Instrução de Trabalho: `, { continued: true })
      .fillColor('#555').text(normalizarQuebrasDeLinha(pop.instrucaoTrabalho));
    doc.moveDown();
  });

  doc.end();
  await finished;

  const pdfBuffer = Buffer.concat(chunks);
  const hoje = hojeISOSaoPaulo();
  const nomeArquivo = `pops_${setor.nome.replace(/[^a-zA-Z0-9]+/g, '_')}_${hoje}.pdf`;

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
    },
  });
}
