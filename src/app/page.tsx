import { getComunicados } from '@/actions/comunicados';
import { getLembretesProximos } from '@/actions/lembretes';
import { getSetores } from '@/actions/setores';
import { isAdmin } from '@/actions/admin';
import Link from 'next/link';
import ComunicadoCard from '@/components/ComunicadoCard';
import LembretesWidget from '@/components/LembretesWidget';
import LogoutButton from '@/components/LogoutButton';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [comunicados, lembretes, setores, adminMode] = await Promise.all([
    getComunicados(),
    getLembretesProximos(30),
    getSetores(),
    isAdmin(),
  ]);

  const destaques = comunicados.filter((c) => c.destaque);
  const feed = comunicados.filter((c) => !c.destaque);

  const hoje = new Date();
  const diaSemana = hoje.toLocaleDateString('pt-BR', { weekday: 'long' });
  const dataFormatada = hoje.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Mural de Comunicados</h1>
          <nav className="breadcrumb">
            <span className="breadcrumb-current" style={{ textTransform: 'capitalize' }}>
              {diaSemana}, {dataFormatada}
            </span>
          </nav>
        </div>
        {adminMode && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <LogoutButton />
            <Link href="/admin/comunicados/novo" className="btn btn-primary btn-sm">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Novo Comunicado
            </Link>
          </div>
        )}
      </div>

      {/* Layout principal: feed + sidebar */}
      <div className="mural-layout">

        {/* Coluna principal */}
        <div className="mural-main">

          {/* Destaques */}
          {destaques.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div className="section-label">📌 Em destaque</div>
              <div className="destaques-grid">
                {destaques.map((c) => (
                  <ComunicadoCard key={c.id} comunicado={c} />
                ))}
              </div>
            </div>
          )}

          {/* Feed de comunicados */}
          <div>
            <div className="section-label">📢 Comunicados Recentes</div>
            {feed.length === 0 && destaques.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                  </div>
                  <h3>Nenhum comunicado ainda</h3>
                  <p>
                    {adminMode
                      ? 'Crie o primeiro comunicado para a equipe.'
                      : 'Aguarde o administrador publicar comunicados.'}
                  </p>
                  {adminMode && (
                    <Link href="/admin/comunicados/novo" className="btn btn-primary">
                      Criar Comunicado
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="feed-lista">
                {feed.map((c) => (
                  <ComunicadoCard key={c.id} comunicado={c} />
                ))}
                {feed.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    Sem outros comunicados além dos destaques.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Coluna lateral */}
        <div className="mural-sidebar">

          {/* Lembretes */}
          <LembretesWidget lembretes={lembretes} />

          {/* Acesso rápido aos setores */}
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-title">🏢 Setores</div>
            {setores.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Nenhum setor cadastrado.</p>
            ) : (
              <div className="setores-lista-compacta">
                {setores.map((setor) => (
                  <Link key={setor.id} href={`/setores/${setor.id}`} className="setor-compacto">
                    <span className="setor-compacto-nome">{setor.nome}</span>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
                <Link href="/setores" className="btn btn-outline btn-sm" style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}>
                  Ver todos os setores
                </Link>
              </div>
            )}
          </div>

          {/* Admin quick links */}
          {adminMode && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-title">⚙️ Administração</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Link href="/admin/comunicados/novo" className="btn btn-primary btn-sm">
                  + Novo Comunicado
                </Link>
                <Link href="/admin/avisos?aba=lembretes" className="btn btn-secondary btn-sm">
                  + Gerenciar Lembretes
                </Link>
                <Link href="/admin/avisos?aba=ocorrencias" className="btn btn-secondary btn-sm">
                  ⚠️ Ver Ocorrências
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
