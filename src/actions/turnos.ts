'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

function parseData(dataString: string) {
  const data = new Date(dataString);
  data.setUTCHours(0, 0, 0, 0);
  return data;
}

function hojeISO() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

interface ChecklistItem {
  ok: boolean;
  obs?: string;
}

interface AbrirTurnoInput {
  coletorId: string;
  veiculoId: string;
  kmInicial: number;
  combustivelInicial: string;
  oleo: ChecklistItem;
  agua: ChecklistItem;
  pneus: ChecklistItem;
  luzes: ChecklistItem;
  observacaoInicial?: string;
}

interface EncerrarTurnoInput {
  kmFinal: number;
  abastecimentoValor?: number;
  abastecimentoNota?: string;
  problemaCarro?: string;
}

/** Turno aberto do coletor (independente da data — só pode haver um por vez). */
export async function getTurnoAberto(coletorId: string) {
  return prisma.turno.findFirst({
    where: { coletorId, status: 'ABERTO' },
    include: { veiculo: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function abrirTurno(input: AbrirTurnoInput) {
  const existente = await getTurnoAberto(input.coletorId);
  if (existente) {
    throw new Error('Já existe um turno aberto para este coletor. Encerre o turno anterior antes de abrir outro.');
  }
  if (!input.veiculoId) throw new Error('Selecione o veículo.');
  if (!Number.isFinite(input.kmInicial) || input.kmInicial < 0) throw new Error('KM inicial inválido.');
  if (!input.combustivelInicial) throw new Error('Selecione o nível de combustível.');

  const turno = await prisma.turno.create({
    data: {
      data: parseData(hojeISO()),
      coletorId: input.coletorId,
      veiculoId: input.veiculoId,
      kmInicial: input.kmInicial,
      combustivelInicial: input.combustivelInicial,
      oleoOk: input.oleo.ok,
      oleoObs: input.oleo.ok ? null : (input.oleo.obs?.trim() || null),
      aguaOk: input.agua.ok,
      aguaObs: input.agua.ok ? null : (input.agua.obs?.trim() || null),
      pneusOk: input.pneus.ok,
      pneusObs: input.pneus.ok ? null : (input.pneus.obs?.trim() || null),
      luzesOk: input.luzes.ok,
      luzesObs: input.luzes.ok ? null : (input.luzes.obs?.trim() || null),
      observacaoInicial: input.observacaoInicial?.trim() || null,
    },
  });

  revalidatePath('/coletas/motorista');
  revalidatePath('/coletas/turnos');
  return turno;
}

export async function encerrarTurno(turnoId: string, input: EncerrarTurnoInput) {
  const turno = await prisma.turno.findUnique({ where: { id: turnoId } });
  if (!turno) throw new Error('Turno não encontrado.');
  if (turno.status === 'ENCERRADO') throw new Error('Este turno já foi encerrado.');
  if (!Number.isFinite(input.kmFinal) || input.kmFinal < turno.kmInicial) {
    throw new Error('KM final inválido (deve ser maior ou igual ao KM inicial).');
  }

  await prisma.turno.update({
    where: { id: turnoId },
    data: {
      status: 'ENCERRADO',
      kmFinal: input.kmFinal,
      abastecimentoValor: input.abastecimentoValor ?? null,
      abastecimentoNota: input.abastecimentoNota?.trim() || null,
      problemaCarro: input.problemaCarro?.trim() || null,
      encerradoEm: new Date(),
    },
  });

  revalidatePath('/coletas/motorista');
  revalidatePath('/coletas/turnos');
}

export async function getTurnosPorData(dataString: string) {
  const data = parseData(dataString);
  return prisma.turno.findMany({
    where: { data },
    include: { coletor: true, veiculo: true },
    orderBy: { liberadoEm: 'asc' },
  });
}

export async function getTurnosMensais(mes: number, ano: number) {
  const dataInicio = new Date(`${ano}-${String(mes).padStart(2, '0')}-01T00:00:00Z`);
  const proximoMes = mes === 12 ? 1 : mes + 1;
  const proximoAno = mes === 12 ? ano + 1 : ano;
  const dataFim = new Date(`${proximoAno}-${String(proximoMes).padStart(2, '0')}-01T00:00:00Z`);

  return prisma.turno.findMany({
    where: { data: { gte: dataInicio, lt: dataFim } },
    include: { coletor: true, veiculo: true },
    orderBy: [{ data: 'asc' }, { liberadoEm: 'asc' }],
  });
}
