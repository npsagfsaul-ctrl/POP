import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/actions/admin';
import { coletasLiberado } from '@/actions/coletasAcesso';
import { getColetasMensais } from '@/actions/coletas';
import { normalizarQuebrasDeLinha } from '@/lib/texto';
import { STATUS_COLETA_LABEL, StatusColetaTexto } from '@/lib/coletasStatus';
import ExcelJS from 'exceljs';
import { hojeISOSaoPaulo } from '@/lib/data';

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

function horaBR(d: Date) {
  return new Date(d).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

function respostaCsv(nome: string, linhas: string[]) {
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
  // Admin OU quem já liberou o acesso às Coletas com a senha
  if (!(await isAdmin()) && !(await coletasLiberado())) {
    return new NextResponse('Não autorizado', { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const tipo = params.get('tipo') || 'coletas';
  const hoje = hojeISOSaoPaulo();

  if (tipo === 'clientes') {
    const clientes = await prisma.cliente.findMany({ orderBy: { nome: 'asc' } });
    const linhas = [
      csvLinha(['Nome', 'Código', 'Ativo']),
      ...clientes.map((c) => csvLinha([c.nome, c.codigo, c.ativo ? 'Sim' : 'Não'])),
    ];
    return respostaCsv(`clientes_backup_${hoje}.csv`, linhas);
  }

  if (tipo === 'coletores') {
    const coletores = await prisma.coletor.findMany({ orderBy: { nome: 'asc' } });
    const linhas = [
      csvLinha(['Nome', 'Cor', 'Ativo']),
      ...coletores.map((c) => csvLinha([c.nome, c.cor, c.ativo ? 'Sim' : 'Não'])),
    ];
    return respostaCsv(`coletores_backup_${hoje}.csv`, linhas);
  }

  // Padrão: coletas — Excel (.xlsx). Com mes/ano filtra o mês; sem, traz tudo.
  const mes = params.has('mes') ? parseInt(params.get('mes')!, 10) : null;
  const ano = params.has('ano') ? parseInt(params.get('ano')!, 10) : null;

  const coletas =
    mes && ano
      ? await getColetasMensais(mes, ano)
      : await prisma.coleta.findMany({
          include: { coletor: true, cliente: true, atendente: true, rotaFixa: { include: { rota: true } } },
          orderBy: [{ data: 'desc' }, { periodo: 'asc' }, { createdAt: 'asc' }],
        });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Portal AGF Saul';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Coletas', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = [
    { header: 'Data', key: 'data', width: 12 },
    { header: 'Período', key: 'periodo', width: 10 },
    { header: 'Tipo', key: 'tipo', width: 8 },
    { header: 'Coletor', key: 'coletor', width: 16 },
    { header: 'Rota', key: 'rota', width: 16 },
    { header: 'Cliente', key: 'cliente', width: 32 },
    { header: 'Código', key: 'codigo', width: 10 },
    { header: 'Funcionário', key: 'funcionario', width: 16 },
    { header: 'Cadastrada às', key: 'cadastradaAs', width: 13 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Hora da coleta', key: 'horaColeta', width: 13 },
    { header: 'Não teve coleta', key: 'naoTeve', width: 14 },
    { header: 'Observação', key: 'observacao', width: 45 },
  ];

  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });

  coletas.forEach((c) => {
    const row = sheet.addRow({
      data: dataBR(c.data),
      periodo: PERIODO_LABEL[c.periodo] ?? c.periodo,
      tipo: TIPO_LABEL[c.tipo] ?? c.tipo,
      coletor: c.coletor.nome,
      rota: c.rotaFixa?.rota?.nome ?? '',
      cliente: c.cliente.nome,
      codigo: c.cliente.codigo ?? '',
      funcionario: c.atendente?.nome ?? '',
      cadastradaAs: horaBR(c.createdAt),
      status: STATUS_COLETA_LABEL[c.status as StatusColetaTexto] ?? c.status,
      horaColeta: c.horaColeta ? horaBR(c.horaColeta) : '',
      naoTeve: c.naoTeveColeta ? 'Sim' : 'Não',
      observacao: c.observacao ? normalizarQuebrasDeLinha(c.observacao) : '',
    });
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'top', wrapText: true };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const nomeArquivo =
    mes && ano
      ? `coletas_${ano}-${String(mes).padStart(2, '0')}.xlsx`
      : `coletas_historico_${hoje}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
    },
  });
}
