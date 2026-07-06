import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizarQuebrasDeLinha } from '@/lib/texto';
import { STATUS_PROSPECCAO_LABEL, StatusProspeccaoTexto } from '@/lib/prospeccaoStatus';

function csvLinha(valores: (string | null | undefined)[]) {
  return valores
    .map((v) => `"${(v ?? '').toString().replace(/"/g, '""')}"`)
    .join(';');
}

function dataBR(d: Date) {
  const dt = new Date(d);
  return `${String(dt.getUTCDate()).padStart(2, '0')}/${String(dt.getUTCMonth() + 1).padStart(2, '0')}/${dt.getUTCFullYear()}`;
}

/** GET /api/prospeccao/export — CSV com todo o histórico de prospecção */
export async function GET() {
  const prospeccoes = await prisma.prospeccao.findMany({
    include: { setor: true, atendente: true },
    orderBy: { data: 'desc' },
  });

  const hoje = new Date().toISOString().slice(0, 10);
  const linhas = [
    csvLinha(['Data', 'Cliente', 'Telefone', 'O que Vende', 'Setor', 'Funcionário', 'Status']),
    ...prospeccoes.map((p) =>
      csvLinha([
        dataBR(p.data),
        normalizarQuebrasDeLinha(p.nomeCliente),
        p.telefone,
        p.oQueVende ? normalizarQuebrasDeLinha(p.oQueVende) : null,
        p.setor.nome,
        p.atendente.nome,
        STATUS_PROSPECCAO_LABEL[p.status as StatusProspeccaoTexto],
      ]),
    ),
  ];

  const csv = '﻿' + linhas.join('\r\n'); // BOM para o Excel reconhecer UTF-8
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="prospeccao_historico_${hoje}.csv"`,
    },
  });
}
