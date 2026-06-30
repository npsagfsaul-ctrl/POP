import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/actions/admin';

const PERIODO_LABEL: Record<string, string> = { MANHA: 'Manhã', TARDE: 'Tarde', RETORNO: 'Retorno' };
const TIPO_LABEL: Record<string, string> = { FIXA: 'Fixa', EXTRA: 'Extra' };

function csvLinha(valores: (string | null | undefined)[]) {
  return valores
    .map((v) => `"${(v ?? '').toString().replace(/"/g, '""')}"`)
    .join(';');
}

function dataBR(d: Date) {
  const dt = new Date(d);
  return `${String(dt.getUTCDate()).padStart(2, '0')}/${String(dt.getUTCMonth() + 1).padStart(2, '0')}/${dt.getUTCFullYear()}`;
}

function resposta(nome: string, linhas: string[]) {
  // BOM (﻿) para o Excel reconhecer UTF-8 e mostrar acentos corretamente
  const csv = '﻿' + linhas.join('\r\n');
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nome}"`,
    },
  });
}

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return new NextResponse('Não autorizado', { status: 403 });
  }

  const tipo = new URL(request.url).searchParams.get('tipo') || 'coletas';
  const hoje = new Date().toISOString().slice(0, 10);

  if (tipo === 'clientes') {
    const clientes = await prisma.cliente.findMany({ orderBy: { nome: 'asc' } });
    const linhas = [
      csvLinha(['Nome', 'Código', 'Ativo']),
      ...clientes.map((c) => csvLinha([c.nome, c.codigo, c.ativo ? 'Sim' : 'Não'])),
    ];
    return resposta(`clientes_backup_${hoje}.csv`, linhas);
  }

  if (tipo === 'coletores') {
    const coletores = await prisma.coletor.findMany({ orderBy: { nome: 'asc' } });
    const linhas = [
      csvLinha(['Nome', 'Cor', 'Ativo']),
      ...coletores.map((c) => csvLinha([c.nome, c.cor, c.ativo ? 'Sim' : 'Não'])),
    ];
    return resposta(`coletores_backup_${hoje}.csv`, linhas);
  }

  // Padrão: todas as coletas (histórico completo)
  const coletas = await prisma.coleta.findMany({
    include: { coletor: true, cliente: true, atendente: true },
    orderBy: [{ data: 'desc' }, { periodo: 'asc' }, { createdAt: 'asc' }],
  });

  const linhas = [
    csvLinha(['Data', 'Período', 'Tipo', 'Coletor', 'Cliente', 'Código', 'Atendente', 'Observação', 'Não teve coleta']),
    ...coletas.map((c) =>
      csvLinha([
        dataBR(c.data),
        PERIODO_LABEL[c.periodo] ?? c.periodo,
        TIPO_LABEL[c.tipo] ?? c.tipo,
        c.coletor.nome,
        c.cliente.nome,
        c.cliente.codigo,
        c.atendente?.nome ?? '',
        c.observacao,
        c.naoTeveColeta ? 'Sim' : 'Não',
      ]),
    ),
  ];
  return resposta(`coletas_backup_${hoje}.csv`, linhas);
}
