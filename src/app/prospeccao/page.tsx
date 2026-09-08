import Link from 'next/link';
import { getSetores } from '@/actions/setores';
import { getAtendentes } from '@/actions/atendentes';
import { getProspeccoes, getResumoProspeccao, FiltrosProspeccao } from '@/actions/prospeccao';
import { EscopoProspeccao, DIAS_SEM_RETORNO_NA_LISTA } from '@/lib/prospeccaoStatus';
import ProspeccaoManager from '@/components/ProspeccaoManager';

export const dynamic = 'force-dynamic';

export default async function ProspeccaoPage({
  searchParams,
}: {
  searchParams: Promise<{
    setorId?: string; atendenteId?: string; status?: string; mes?: string; ano?: string;
  }>;
}) {
  const sp = await searchParams;

  // Sem escolha na URL, a lista abre só com o que ainda precisa de ação. O
  // histórico não some: continua a um clique em "ver todas" e no Excel.
  const escopo = (sp.status as EscopoProspeccao) || 'aberto';

  const mes = sp.mes ? parseInt(sp.mes) : undefined;
  const ano = sp.ano ? parseInt(sp.ano) : undefined;

  const filtros: FiltrosProspeccao = {
    setorId: sp.setorId || undefined,
    atendenteId: sp.atendenteId || undefined,
    escopo,
    mes, ano,
  };

  const [setores, atendentes, prospeccoes, resumo] = await Promise.all([
    getSetores(),
    getAtendentes(true),
    getProspeccoes(filtros),
    getResumoProspeccao({ setorId: filtros.setorId, atendenteId: filtros.atendenteId }),
  ]);

  const prospeccoesView = prospeccoes.map((p) => ({
    id: p.id,
    data: new Date(p.data).toISOString().slice(0, 10),
    nomeCliente: p.nomeCliente,
    telefone: p.telefone,
    oQueVende: p.oQueVende,
    status: p.status,
    setorId: p.setorId,
    atendenteId: p.atendenteId,
    setorNome: p.setor.nome,
    atendenteNome: p.atendente.nome,
  }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Prospecção</h1>
          <nav className="breadcrumb">
            <Link href="/" className="breadcrumb-link">Mural</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">Prospecção</span>
          </nav>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/api/prospeccao/export" className="btn btn-secondary btn-sm">⬇ Excel (histórico completo)</a>
          <Link href="/prospeccao/cadastros" className="btn btn-secondary btn-sm">⚙ Cadastrar Funcionário</Link>
        </div>
      </div>

      <ProspeccaoManager
        prospeccoes={prospeccoesView}
        setores={setores.map((s) => ({ id: s.id, nome: s.nome }))}
        atendentes={atendentes.map((a) => ({ id: a.id, nome: a.nome }))}
        filtroSetorId={sp.setorId}
        filtroAtendenteId={sp.atendenteId}
        filtroStatus={escopo}
        contagemPorStatus={resumo.porStatus}
        totalGeral={resumo.total}
        totalEmAberto={resumo.emAberto}
        diasSemRetorno={DIAS_SEM_RETORNO_NA_LISTA}
        meses={resumo.meses}
        filtroMes={mes}
        filtroAno={ano}
      />
    </div>
  );
}
