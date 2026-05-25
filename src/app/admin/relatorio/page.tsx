import { isAdmin } from '@/actions/admin';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getRegistrosMensais } from '@/actions/checklist';

export const dynamic = 'force-dynamic';

export default async function RelatorioGeral({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string, ano?: string }>
}) {
  const adminMode = await isAdmin();
  
  if (!adminMode) {
    notFound();
  }

  const resolvedSearchParams = await searchParams;
  const hoje = new Date();
  const mesAtual = resolvedSearchParams.mes ? parseInt(resolvedSearchParams.mes) : hoje.getMonth() + 1;
  const anoAtual = resolvedSearchParams.ano ? parseInt(resolvedSearchParams.ano) : hoje.getFullYear();

  const setores = await prisma.setor.findMany({
    include: { pops: true }
  });

  const relatorioSetores = await Promise.all(setores.map(async (setor) => {
    const pops = setor.pops;
    const registros = await getRegistrosMensais(setor.id, mesAtual, anoAtual);

    const pesoTotal = pops.reduce((acc, p) => acc + p.peso, 0);
    let somaConformidade = 0;
    let diasContados = 0;

    registros.forEach(reg => {
      if (new Date(reg.data).getUTCDay() !== 0) { // Não conta domingo
        let pesoAtingido = 0;
        const respostas = reg.respostas as Record<string, boolean>;
        pops.forEach(pop => {
          if (respostas && respostas[pop.id] === true) pesoAtingido += pop.peso;
        });
        somaConformidade += pesoTotal > 0 ? (pesoAtingido / pesoTotal) * 100 : 0;
        diasContados++;
      }
    });

    const mediaConformidade = diasContados > 0 ? Math.round(somaConformidade / diasContados) : 0;

    return {
      ...setor,
      mediaConformidade,
      diasContados
    };
  }));

  const nomeMeses = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
  ];

  const prevMes = mesAtual === 1 ? 12 : mesAtual - 1;
  const prevAno = mesAtual === 1 ? anoAtual - 1 : anoAtual;
  const nextMes = mesAtual === 12 ? 1 : mesAtual + 1;
  const nextAno = mesAtual === 12 ? anoAtual + 1 : anoAtual;

  return (
    <div>
      <div className="page-header">
        <div>
          <nav className="breadcrumb" style={{ marginBottom: 4 }}>
            <Link href="/">Setores</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">Relatório Geral</span>
          </nav>
          <h1 className="page-title">Relatório Geral de Metas</h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '4px' }}>
            <Link
              href={`/admin/relatorio?mes=${prevMes}&ano=${prevAno}`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', transition: 'all 0.15s ease' }}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', padding: '0 8px' }}>
              {nomeMeses[mesAtual - 1]} de {anoAtual}
            </span>
            <Link
              href={`/admin/relatorio?mes=${nextMes}&ano=${nextAno}`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', transition: 'all 0.15s ease' }}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      <div className="card">
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: '12px 8px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Setor</th>
              <th style={{ padding: '12px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>POPs Ativos</th>
              <th style={{ padding: '12px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Dias Preenchidos</th>
              <th style={{ padding: '12px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Conformidade Média</th>
              <th style={{ padding: '12px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {relatorioSetores.map((setor) => (
              <tr key={setor.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '16px 8px', fontWeight: 600 }}>{setor.nome}</td>
                <td style={{ padding: '16px 8px', textAlign: 'center' }}>{setor.pops.length}</td>
                <td style={{ padding: '16px 8px', textAlign: 'center' }}>{setor.diasContados}</td>
                <td style={{ padding: '16px 8px', textAlign: 'center' }}>
                  <span className={`badge ${setor.mediaConformidade >= 80 ? 'badge-success' : 'badge-warning'}`}>
                    {setor.mediaConformidade}%
                  </span>
                </td>
                <td style={{ padding: '16px 8px', textAlign: 'center' }}>
                  <Link href={`/setores/${setor.id}`} className="btn btn-secondary btn-sm">
                    Ver Painel
                  </Link>
                </td>
              </tr>
            ))}
            {relatorioSetores.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Nenhum setor encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
