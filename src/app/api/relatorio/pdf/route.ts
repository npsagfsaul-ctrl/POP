import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calcularConformidade } from '@/lib/conformidade';
import PDFDocument from 'pdfkit';

function getCurrentMonthYear() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

/** GET /api/relatorio/pdf */
export async function GET() {
  const { month, year } = getCurrentMonthYear();

  // Reuse logic from the JSON endpoint
  const setores = await prisma.setor.findMany({ include: { pops: true } });
  const registros = await prisma.registroDiario.findMany({
    where: { data: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) } },
  });

  const relatorio = await Promise.all(
    setores.map(async setor => {
      const registrosSetor = registros.filter(r => r.setorId === setor.id);

      // Mesma regra do dashboard: dias úteis até hoje, a partir da criação
      // do setor; dia sem checklist = 0%. Métrica oficial: percentualPerfeitos.
      const { media: mediaPonderada, percentualPerfeitos: percentual } = calcularConformidade(
        setor.pops, registrosSetor, month, year, new Date(), setor.createdAt,
      );

      const concluidoIds = new Set<string>();
      for (const reg of registrosSetor) {
        const respostas = reg.respostas as Record<string, boolean>;
        for (const [id, ok] of Object.entries(respostas)) if (ok) concluidoIds.add(id);
      }
      const principaisPops = setor.pops
        .filter(p => concluidoIds.has(p.id))
        .sort((a, b) => b.peso - a.peso)
        .slice(0, 3);

      return {
        nome: setor.nome,
        percentual: Number(percentual.toFixed(2)),
        mediaPonderada: Number(mediaPonderada.toFixed(2)),
        principaisPops,
      };
    })
  );

  // Generate PDF
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const chunks: Uint8Array[] = [];
  doc.on('data', chunk => chunks.push(chunk));
  const finished = new Promise<void>(resolve => doc.on('end', () => resolve()));

  doc.fontSize(20).text('Relatório de Metas por Setor', { align: 'center' });
  doc.moveDown();

  relatorio.forEach(item => {
    doc.fontSize(14).fillColor('#333').text(`Setor: ${item.nome}`);
    doc.fontSize(12).fillColor('#555').text(`Percentual: ${item.percentual}%`);
    doc.fontSize(9).fillColor('#888').text(`(média ponderada: ${item.mediaPonderada}%)`);
    if (item.principaisPops.length > 0) {
      doc.text('Principais POPs:');
      item.principaisPops.forEach(pop => {
        doc.text(`- ${pop.titulo} (peso: ${pop.peso})`, { indent: 20 });
      });
    }
    doc.moveDown();
  });

  doc.end();
  await finished;

  const pdfBuffer = Buffer.concat(chunks);
  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="relatorio_${year}_${month}.pdf"`,
    },
  });
}
