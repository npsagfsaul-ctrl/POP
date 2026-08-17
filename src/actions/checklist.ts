'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { podeEditarChecklist, ehDataFutura, DIA_LIMITE_FECHAMENTO } from '@/lib/data';

export async function salvarChecklist(formData: FormData) {
  const setorId = formData.get('setorId') as string;
  const dataString = formData.get('data') as string; // yyyy-mm-dd
  
  if (!setorId || !dataString) {
    throw new Error('Setor e Data são obrigatórios.');
  }

  // Parse date and reset time to 00:00:00 to match DB
  const data = new Date(dataString);
  data.setUTCHours(0, 0, 0, 0);

  if (data.getUTCDay() === 0) {
    throw new Error('Não é possível preencher checklist aos domingos (domingos não contam para a meta).');
  }

  // Dia que ainda não aconteceu não pode ser dado como conferido.
  if (ehDataFutura(dataString)) {
    throw new Error('Não é possível preencher o checklist de um dia que ainda não aconteceu.');
  }

  // Mês já fechado não aceita mais alteração — senão a nota de um mês já pago
  // pode mudar meses depois, sem ninguém perceber. A validação de verdade é
  // esta (no servidor); o `min` no formulário é só conveniência.
  if (!podeEditarChecklist(dataString)) {
    throw new Error(
      `Este mês já foi fechado e não aceita mais alterações. O mês anterior pode ser preenchido até o dia ${DIA_LIMITE_FECHAMENTO}.`,
    );
  }

  // Collect responses from form data
  const respostas: Record<string, boolean> = {};
  // Quem foi apontado como responsável por cada pendência. Montado do zero a
  // cada save (igual `respostas`), para que desmarcar um POP não deixe uma
  // atribuição órfã que ressuscitaria se o POP falhar de novo num edit futuro.
  const responsaveis: Record<string, string[]> = {};

  const popsDoSetor = await prisma.pop.findMany({
    where: { setorId },
    select: { id: true, titulo: true }
  });

  popsDoSetor.forEach(pop => {
    respostas[pop.id] = true; // Por padrão, tudo é conforme
  });

  const observacoesList: string[] = [];

  for (const [key, value] of formData.entries()) {
    if (key.startsWith('pop_')) {
      const popId = key.replace('pop_', '');
      if (value === 'on' || value === 'true') {
        respostas[popId] = false; // Tem ocorrência (marcado)

        // Pode ter mais de um responsável pelo mesmo POP — quando duas pessoas
        // deixaram passar, as duas erraram. Nenhum marcado = pendência sem
        // responsável, que aparece no relatório num balde próprio.
        const ids = formData
          .getAll(`resp_pop_${popId}`)
          .map((v) => String(v).trim())
          .filter((v) => v !== '');
        if (ids.length > 0) {
          responsaveis[popId] = [...new Set(ids)];
        }

        const desc = formData.get(`desc_pop_${popId}`) as string;
        if (desc && desc.trim()) {
           const pop = popsDoSetor.find(p => p.id === popId);
           if (pop) {
             observacoesList.push(`[Ocorrência - ${pop.titulo}]\n${desc.trim()}\n[Fim Ocorrência]`);
           }
        }
      }
    }
  }

  const globalObs = formData.get('observacoes_globais') as string;
  if (globalObs && globalObs.trim()) {
    observacoesList.push(globalObs.trim());
  }

  const observacoesFinal = observacoesList.length > 0 ? observacoesList.join('\n\n') : null;

  // Salvar no banco (cria ou atualiza para o mesmo dia e setor)
  const registroExistente = await prisma.registroDiario.findFirst({
    where: {
      setorId,
      data
    }
  });

  if (registroExistente) {
    await prisma.registroDiario.update({
      where: { id: registroExistente.id },
      data: { respostas, responsaveis, observacoes: observacoesFinal || '' }
    });
  } else {
    await prisma.registroDiario.create({
      data: {
        setorId,
        data,
        respostas,
        responsaveis,
        observacoes: observacoesFinal || ''
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
