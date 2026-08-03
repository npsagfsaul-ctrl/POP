import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calcularConformidade } from '@/lib/conformidade';
import { isAdmin } from '@/actions/admin';

// Helper to get current month/year
function getCurrentMonthYear() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

/** GET /api/relatorio?mes=6&ano=2026 (mes/ano opcionais; padrão é o mês corrente) */
export async function GET(request: Request) {
  // Desempenho de todos os setores — só para o administrador.
  if (!(await isAdmin())) {
    return new NextResponse('Não autorizado', { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const { month: mesAtual, year: anoAtual } = getCurrentMonthYear();
  const month = params.has('mes') ? parseInt(params.get('mes')!, 10) : mesAtual;
  const year = params.has('ano') ? parseInt(params.get('ano')!, 10) : anoAtual;

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
      const registrosSetor = registros.filter(r => r.setorId === setor.id);

      // Mesma regra do dashboard: dias úteis até hoje, a partir da criação
      // do setor; dia sem checklist = 0%. Métrica oficial: percentualPerfeitos.
      const { media: mediaPonderada, percentualPerfeitos: percentual } = calcularConformidade(
        setor.pops, registrosSetor, month, year, new Date(), setor.createdAt,
      );

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
        percentual: Number(percentual.toFixed(2)),
        mediaPonderada: Number(mediaPonderada.toFixed(2)),
        principaisPops,
      };
    })
  );

  return NextResponse.json(relatorio);
}
