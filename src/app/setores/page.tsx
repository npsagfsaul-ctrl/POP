import { getSetores } from '@/actions/setores';
import { isAdmin } from '@/actions/admin';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';

export const dynamic = 'force-dynamic';

export default async function SetoresPage() {
  const setores = await getSetores();
  const adminMode = await isAdmin();

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Setores Operacionais</h1>
          <nav className="breadcrumb">
            <Link href="/" className="breadcrumb-link">Mural</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">Setores</span>
          </nav>
        </div>

        {adminMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LogoutButton />
            <Link href="/admin/relatorio" className="btn btn-secondary btn-sm">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Relatório Geral
            </Link>
            <Link href="/setores/novo" className="btn btn-primary btn-sm">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Novo Setor
            </Link>
          </div>
        )}
      </div>

      {/* Info banner */}
      <div className="alert alert-info" style={{ marginBottom: 24 }}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {adminMode
          ? 'Modo Administrador ativo. Você pode criar, editar e excluir setores e POPs.'
          : 'Selecione um setor abaixo para acessar e preencher o checklist diário.'}
      </div>

      {/* Setores Grid */}
      {setores.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3>Nenhum setor cadastrado</h3>
            <p>
              {adminMode
                ? 'Comece criando o primeiro setor operacional.'
                : 'Aguarde o administrador cadastrar os setores.'}
            </p>
            {adminMode && (
              <Link href="/setores/novo" className="btn btn-primary">
                Criar Primeiro Setor
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3" style={{ gap: 16 }}>
          {setores.map((setor) => (
            <Link
              key={setor.id}
              href={`/setores/${setor.id}`}
              className="setor-card"
            >
              <div className="setor-card-icon">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>

              <div className="setor-card-name">{setor.nome}</div>

              {adminMode ? (
                <div className="setor-card-meta">
                  <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{setor._count.pops}</span>
                  {' '}{setor._count.pops === 1 ? 'procedimento cadastrado' : 'procedimentos cadastrados'}
                </div>
              ) : (
                <div className="setor-card-meta">Clique para acessar o checklist</div>
              )}

              <div className="setor-card-footer">
                {setor.senha ? (
                  <span className="badge-restricted">
                    <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Restrito
                  </span>
                ) : (
                  <span className="badge badge-success">Aberto</span>
                )}

                <div className="setor-card-cta">
                  {adminMode ? 'Ver Painel' : 'Acessar'}
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
