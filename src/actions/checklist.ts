'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function salvarChecklist(formData: FormData) {
  const setorId = formData.get('setorId') as string;
  const dataString = formData.get('data') as string; // yyyy-mm-dd
  
  if (!setorId || !dataString) {
    throw new Error('Setor e Data são obrigatórios.');
  }

  // Parse date and reset time to 00:00:00 to match DB
  const data = new Date(dataString);
  data.setUTCHours(0, 0, 0, 0);

  // Collect responses from form data
  const respostas: Record<string, boolean> = {};
  
  // All fields starting with 'pop_' are checklist items
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('pop_')) {
      const popId = key.replace('pop_', '');
      respostas[popId] = value === 'on' || value === 'true';
    }
  }

  // Obter todos os POPs do setor para garantir que os desmarcados fiquem como false
  const popsDoSetor = await prisma.pop.findMany({
    where: { setorId },
    select: { id: true }
  });

  popsDoSetor.forEach(pop => {
    if (!(pop.id in respostas)) {
      respostas[pop.id] = false;
    }
  });

  // Salvar no banco (cria ou atualiza para o mesmo dia e setor)
  const registroExistente = await prisma.registroDiario.findFirst({
    where: {
      setorId,
      data
    }
  });

  const observacoes = formData.get('observacoes') as string;

  if (registroExistente) {
    await prisma.registroDiario.update({
      where: { id: registroExistente.id },
      data: { respostas, observacoes }
    });
  } else {
    await prisma.registroDiario.create({
      data: {
        setorId,
        data,
        respostas,
        observacoes
      }
    });
  }

  revalidatePath(`/setores/${setorId}`);
  redirect(`/setores/${setorId}`);
}

export async function getRegistrosMensais(setorId: string, mes: number, ano: number) {
  // Mês no formato 1 a 12
  const dataInicio = new Date(`${ano}-${String(mes).padStart(2, '0')}-01T00:00:00Z`);
  const proximoMes = mes === 12 ? 1 : mes + 1;
  const proximoAno = mes === 12 ? ano + 1 : ano;
  const dataFim = new Date(`${proximoAno}-${String(proximoMes).padStart(2, '0')}-01T00:00:00Z`);

  return await prisma.registroDiario.findMany({
    where: {
      setorId,
      data: {
        gte: dataInicio,
        lt: dataFim,
      },
    },
  });
}

export async function getRegistroPorData(setorId: string, dataString: string) {
  const data = new Date(dataString);
  data.setUTCHours(0, 0, 0, 0);

  return await prisma.registroDiario.findFirst({
    where: {
      setorId,
      data
    }
  });
}

export async function salvarComentarioAdmin(setorId: string, dataString: string, comentarioAdmin: string) {
  const data = new Date(dataString);
  data.setUTCHours(0, 0, 0, 0);

  const registroExistente = await prisma.registroDiario.findFirst({
    where: { setorId, data }
  });

  if (registroExistente) {
    await prisma.registroDiario.update({
      where: { id: registroExistente.id },
      data: { 
        comentarioAdmin, 
        alertaAdmin: comentarioAdmin.trim() !== '' 
      }
    });
  } else {
    // Se não existir, criamos um em branco só para o comentário
    await prisma.registroDiario.create({
      data: {
        setorId,
        data,
        respostas: {},
        comentarioAdmin,
        alertaAdmin: comentarioAdmin.trim() !== ''
      }
    });
  }

  revalidatePath(`/setores/${setorId}`);
}

export async function marcarAlertaComoLido(registroId: string, setorId: string) {
  await prisma.registroDiario.update({
    where: { id: registroId },
    data: { alertaAdmin: false }
  });
  
  revalidatePath(`/setores/${setorId}`);
}
