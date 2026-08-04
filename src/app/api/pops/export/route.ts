import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/actions/admin';
import { podeVerSetor } from '@/actions/setorAcesso';
import { normalizarQuebrasDeLinha } from '@/lib/texto';
import { hojeISOSaoPaulo } from '@/lib/data';
import ExcelJS from 'exceljs';

function dataBR(d: Date) {
  const dt = new Date(d);
  return `${String(dt.getUTCDate()).padStart(2, '0')}/${String(dt.getUTCMonth() + 1).padStart(2, '0')}/${dt.getUTCFullYear()}`;
}

/** Excel trava o nome da aba em 31 caracteres e proíbe : \ / ? * [ ] */
function nomeDeAba(nome: string, usados: Set<string>) {
  let base = nome.replace(/[:\\/?*[\]]/g, '-').slice(0, 31).trim() || 'Setor';
  let candidato = base;
  let n = 2;
  while (usados.has(candidato)) {
    const sufixo = ` (${n++})`;
    base = base.slice(0, 31 - sufixo.length);
    candidato = base + sufixo;
  }
  usados.add(candidato);
  return candidato;
}

/**
 * GET /api/pops/export?setorId=XXX — Excel com os POPs de um setor
 * GET /api/pops/export?todos=1     — Excel com todos os setores, uma aba cada
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const todos = params.get('todos') === '1';
  const setorId = params.get('setorId');

  const setores = todos
    ? await prisma.setor.findMany({ orderBy: { nome: 'asc' } })
    : setorId
      ? [await prisma.setor.findUnique({ where: { id: setorId } })].filter((s) => s !== null)
      : [];

  if (!todos && !setorId) {
    return new NextResponse('Informe setorId ou todos=1.', { status: 400 });
  }
  if (setores.length === 0) {
    return new NextResponse('Setor não encontrado.', { status: 404 });
  }

  // O arquivo com todos os setores é do admin. O de um setor só, quem tem
  // acesso àquele setor baixa sozinho — sem depender de pedir para alguém.
  const autorizado = todos ? await isAdmin() : await podeVerSetor(setores[0]!.id);
  if (!autorizado) {
    return new NextResponse('Não autorizado', { status: 403 });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Portal AGF Saul';
  workbook.created = new Date();

  const usados = new Set<string>();

  for (const setor of setores) {
    const pops = await prisma.pop.findMany({
      where: { setorId: setor!.id },
      orderBy: { createdAt: 'asc' },
    });

    const sheet = workbook.addWorksheet(
      todos ? nomeDeAba(setor!.nome, usados) : 'POPs',
      { views: [{ state: 'frozen', ySplit: 1 }] }, // trava o cabeçalho ao rolar
    );

    sheet.columns = [
      { header: 'Título', key: 'titulo', width: 40 },
      { header: 'Peso', key: 'peso', width: 8 },
      { header: 'Orientação de Avaliação', key: 'orientacao', width: 55 },
      { header: 'Instrução de Trabalho', key: 'instrucao', width: 65 },
      { header: 'Situação', key: 'situacao', width: 12 },
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
        situacao: p.desativadoEm ? 'Desativado' : 'Ativo',
        cadastradoEm: dataBR(p.createdAt),
      });
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'top', wrapText: true };
      });
    });

    if (pops.length === 0) {
      sheet.addRow({ titulo: 'Nenhum POP cadastrado neste setor.' });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const hoje = hojeISOSaoPaulo();
  const nomeArquivo = todos
    ? `pops_todos_os_setores_${hoje}.xlsx`
    : `pops_${setores[0]!.nome.replace(/[^a-zA-Z0-9]+/g, '_')}_${hoje}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
    },
  });
}
