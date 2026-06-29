import { isAdmin } from '@/actions/admin';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import CalendarioDashboard from '@/components/CalendarioDashboard';
import PasswordPrompt from '@/components/PasswordPrompt';
import DeleteSetorButton from '@/components/DeleteSetorButton';
import DeletePopButton from '@/components/DeletePopButton';
import { getPopsBySetor } from '@/actions/pops';
import { getRegistrosMensais } from '@/actions/checklist';
import { calcularConformidade } from '@/lib/conformidade';
import prisma from '@/lib/prisma';


export const dynamic = 'force-dynamic';

export default async function VisualizarSetor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>,
  searchParams: Promise<{ mes?: string, ano?: string }>
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const adminMode = await isAdmin();

  const setor = await prisma.setor.findUnique({
    where: { id: resolvedParams.id },
  });

  if (!setor) {
    notFound();
  }

  // Verificar proteção por senha
  if (setor.senha) {
    const cookieStore = await cookies();
    const isAuthed = cookieStore.get(`auth_setor_${setor.id}`);

    if (!isAuthed && !adminMode) {
      return <PasswordPrompt setorId={setor.id} setorNome={setor.nome} />;
    }
  }

  const pops = await getPopsBySetor(resolvedParams.id);

  const hoje = new Date();
  const mesAtual = resolvedSearchParams.mes ? parseInt(resolvedSearchParams.mes) : hoje.getMonth() + 1;
  const anoAtual = resolvedSearchParams.ano ? parseInt(resolvedSearchParams.ano) : hoje.getFullYear();

  const registros = await getRegistrosMensais(resolvedParams.id, mesAtual, anoAtual);

  // Calcular métricas (dias úteis até hoje; dia útil sem checklist conta como 80%)
  const { media: mediaConformidade, diasUteis, diasAbaixo100 } = calcularConformidade(
    pops,
    registros,
    mesAtual,
    anoAtual,
    hoje,
  );

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <nav className="breadcrumb" style={{ marginBottom: 4 }}>
            <Link href="/" className="">Setores</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">{setor.nome}</span>
          </nav>
          <h1 className="page-title">{setor.nome}</h1>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <Link href={`/setores/${setor.id}/checklist`} className="btn btn-success btn-sm">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Preencher Checklist
          </Link>

          {adminMode && (
            <>
              <Link href={`/setores/${setor.id}/editar`} className="btn btn-secondary btn-sm">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar
              </Link>
              <DeleteSetorButton setorId={setor.id} setorNome={setor.nome} />
              <Link href="/pops/novo" className="btn btn-primary btn-sm">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Novo POP
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      {pops.length > 0 && (
        <div className="grid grid-cols-4" style={{ gap: 16, marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-icon primary">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <div className="stat-label">Conformidade Média</div>
              <div className="stat-value" style={{ color: mediaConformidade === 100 ? 'var(--success)' : mediaConformidade >= 80 ? 'var(--warning)' : 'var(--danger)' }}>
                {mediaConformidade}%
              </div>
              <div className="stat-sub">Seg–Sáb este mês</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon info">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <div className="stat-label">POPs Monitorados</div>
              <div className="stat-value">{pops.length}</div>
              <div className="stat-sub">procedimentos ativos</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon warning">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <div className="stat-label">Meta de Qualidade</div>
              <div className="stat-value">80%</div>
              <div className="progress" style={{ marginTop: 8, width: 80 }}>
                <div className="progress-bar primary" style={{ width: '80%' }} />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: diasAbaixo100 === 0 ? 'rgba(34,197,94,0.12)' : 'rgba(251,191,36,0.12)' }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke={diasAbaixo100 === 0 ? 'var(--success)' : 'var(--warning)'} strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <div className="stat-label">Dias Abaixo de 100%</div>
              <div className="stat-value" style={{ color: diasAbaixo100 === 0 ? 'var(--success)' : 'var(--warning)' }}>{diasAbaixo100}</div>
              <div className="stat-sub">{diasAbaixo100 === 0 ? 'sem pendências!' : 'dias com pendência'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar or empty state */}
      {pops.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3>Nenhum POP cadastrado</h3>
            <p>Este setor ainda não possui procedimentos operacionais cadastrados.</p>
            {adminMode && (
              <Link href="/pops/novo" className="btn btn-primary">Adicionar Primeiro POP</Link>
            )}
          </div>
        </div>
      ) : (
        <>
          <CalendarioDashboard
            setorId={resolvedParams.id}
            pops={pops}
            registros={registros.map(r => ({
              ...r,
              respostas: r.respostas as Record<string, boolean>
            }))}
            mes={mesAtual}
            ano={anoAtual}
            adminMode={adminMode}
            mediaMensal={mediaConformidade}
            diasConsiderados={diasUteis}
          />

          {/* POPs List */}
          <div className="card" style={{ marginTop: 24 }}>
            <div className="card-title">
              POPs Cadastrados (Preenchidos no Mês)
              <span className="badge badge-primary" style={{ marginLeft: 8, fontSize: '0.75rem' }}>
                {pops.filter(pop => registros.some(reg => (reg.respostas as Record<string, boolean>)?.[pop.id] !== undefined)).length}
              </span>
            </div>

            {pops.filter(pop => registros.some(reg => (reg.respostas as Record<string, boolean>)?.[pop.id] !== undefined)).map((pop) => (
              <div key={pop.id} style={{
                padding: '14px 0',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 16
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-main)' }}>
                      {pop.titulo}
                    </span>
                    <span className="badge badge-primary" style={{ fontSize: '0.6875rem' }}>
                      Peso {pop.peso}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    <strong style={{ color: 'var(--text-main)' }}>Avaliar:</strong> {pop.orientacaoAvaliacao}
                  </p>
                </div>

                {adminMode && (
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <Link href={`/pops/${pop.id}/editar`} className="btn btn-secondary btn-sm">
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </Link>
                    <DeletePopButton popId={pop.id} setorId={resolvedParams.id} popTitulo={pop.titulo} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
