import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper to get current month/year
function getCurrentMonthYear() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

/** GET /api/relatorio */
export async function GET() {
  const { month, year } = getCurrentMonthYear();

  // Fetch all setores with their POPs
  const setores = await prisma.setor.findMany({
    include: { pops: true },
  });

  // Fetch registros diários do mês corrente
  const registros = await prisma.registroDiario.findMany({
    where: {
      data: {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      },
    },
  });

  const relatorio = await Promise.all(
    setores.map(async setor => {
      const pesoTotal = setor.pops.reduce((a, p) => a + p.peso, 0);
      // Map popId -> peso
      const popMap = new Map(setor.pops.map(p => [p.id, p]));
      let pesoAtingido = 0;

      // Iterate registros do setor
      const registrosSetor = registros.filter(r => r.setorId === setor.id);
      for (const reg of registrosSetor) {
        const respostas = reg.respostas as Record<string, boolean>;
        for (const [popId, ok] of Object.entries(respostas)) {
          if (ok && popMap.has(popId)) {
            pesoAtingido += popMap.get(popId)!.peso;
          }
        }
      }

      const percentual = pesoTotal > 0 ? (pesoAtingido / pesoTotal) * 100 : 0;

      // Principais POPs: top 3 por peso que foram concluídos ao menos uma vez
      const concluidoIds = new Set<string>();
      for (const reg of registrosSetor) {
        const respostas = reg.respostas as Record<string, boolean>;
        for (const [id, ok] of Object.entries(respostas)) {
          if (ok) concluidoIds.add(id);
        }
      }
      const principaisPops = setor.pops
        .filter(p => concluidoIds.has(p.id))
        .sort((a, b) => b.peso - a.peso)
        .slice(0, 3)
        .map(p => ({ id: p.id, titulo: p.titulo, peso: p.peso }));

      return {
        id: setor.id,
        nome: setor.nome,
        pesoTotal,
        pesoAtingido,
        percentual: Number(percentual.toFixed(2)),
        principaisPops,
      };
    })
  );

  return NextResponse.json(relatorio);
}
