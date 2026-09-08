import Link from 'next/link';
import { getSetores } from '@/actions/setores';
import { getAtendentes } from '@/actions/atendentes';
import { getProspeccoes, FiltrosProspeccao } from '@/actions/prospeccao';
import ProspeccaoManager from '@/components/ProspeccaoManager';

export const dynamic = 'force-dynamic';

export default async function ProspeccaoPage({
  searchParams,
}: {
  searchParams: Promise<{ setorId?: string; atendenteId?: string; status?: string }>;
}) {
  const sp = await searchParams;

  const filtros: FiltrosProspeccao = {
    setorId: sp.setorId || undefined,
    atendenteId: sp.atendenteId || undefined,
    status: (sp.status as FiltrosProspeccao['status']) || undefined,
  };

  const [setores, atendentes, prospeccoes] = await Promise.all([
    getSetores(),
    getAtendentes(true),
    getProspeccoes(filtros),
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
        filtroStatus={sp.status}
      />
    </div>
  );
}
