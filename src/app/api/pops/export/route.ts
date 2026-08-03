import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/actions/admin';
import { normalizarQuebrasDeLinha } from '@/lib/texto';
import { hojeISOSaoPaulo } from '@/lib/data';
import ExcelJS from 'exceljs';

function dataBR(d: Date) {
  const dt = new Date(d);
  return `${String(dt.getUTCDate()).padStart(2, '0')}/${String(dt.getUTCMonth() + 1).padStart(2, '0')}/${dt.getUTCFullYear()}`;
}

/** GET /api/pops/export?setorId=XXX — Excel (.xlsx) com os POPs cadastrados de um setor */
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

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Portal AGF Saul';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('POPs', {
    views: [{ state: 'frozen', ySplit: 1 }], // trava a linha de cabeçalho ao rolar
  });

  sheet.columns = [
    { header: 'Título', key: 'titulo', width: 40 },
    { header: 'Peso', key: 'peso', width: 8 },
    { header: 'Orientação de Avaliação', key: 'orientacao', width: 55 },
    { header: 'Instrução de Trabalho', key: 'instrucao', width: 65 },
    { header: 'Cadastrado em', key: 'cadastradoEm', width: 15 },
  ];

  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });

  pops.forEach((p) => {
    const row = sheet.addRow({
      titulo: normalizarQuebrasDeLinha(p.titulo),
      peso: p.peso,
      orientacao: normalizarQuebrasDeLinha(p.orientacaoAvaliacao),
      instrucao: normalizarQuebrasDeLinha(p.instrucaoTrabalho),
      cadastradoEm: dataBR(p.createdAt),
    });
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'top', wrapText: true };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const hoje = hojeISOSaoPaulo();
  const nomeArquivo = `pops_${setor.nome.replace(/[^a-zA-Z0-9]+/g, '_')}_${hoje}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
    },
  });
}
