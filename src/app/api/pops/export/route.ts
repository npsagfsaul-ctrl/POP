import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/actions/admin';

function csvLinha(valores: (string | null | undefined)[]) {
  return valores
    .map((v) => `"${(v ?? '').toString().replace(/"/g, '""')}"`)
    .join(';');
}

function dataBR(d: Date) {
  const dt = new Date(d);
  return `${String(dt.getUTCDate()).padStart(2, '0')}/${String(dt.getUTCMonth() + 1).padStart(2, '0')}/${dt.getUTCFullYear()}`;
}

/** GET /api/pops/export?setorId=XXX — CSV com os POPs cadastrados de um setor */
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

  const hoje = new Date().toISOString().slice(0, 10);
  const linhas = [
    csvLinha(['Título', 'Peso', 'Orientação de Avaliação', 'Instrução de Trabalho', 'Cadastrado em']),
    ...pops.map((p) =>
      csvLinha([p.titulo, String(p.peso), p.orientacaoAvaliacao, p.instrucaoTrabalho, dataBR(p.createdAt)]),
    ),
  ];

  const csv = '﻿' + linhas.join('\r\n'); // BOM para o Excel reconhecer UTF-8
  const nomeArquivo = `pops_${setor.nome.replace(/[^a-zA-Z0-9]+/g, '_')}_${hoje}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
    },
  });
}
