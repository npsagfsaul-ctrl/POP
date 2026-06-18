import { getOcorrencias } from '@/actions/ocorrencias';
import { isAdmin } from '@/actions/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ResolverOcorrenciaForm from '@/components/ResolverOcorrenciaForm';

export const dynamic = 'force-dynamic';

const gravidadeConfig: Record<string, { label: string; badge: string }> = {
  BAIXA:   { label: '🟢 Baixa',   badge: 'badge-success' },
  MEDIA:   { label: '🟡 Média',   badge: 'badge-warning' },
  ALTA:    { label: '🟠 Alta',    badge: 'badge-danger'  },
  CRITICA: { label: '🔴 Crítica', badge: 'badge-danger'  },
};

export default async function OcorrenciasAdminPage() {
  const adminMode = await isAdmin();
  if (!adminMode) redirect('/admin/login');

  const ocorrencias = await getOcorrencias();
  const abertas = ocorrencias.filter((o) => o.status === 'ABERTA');
  const resolvidas = ocorrencias.filter((o) => o.status === 'RESOLVIDA');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Ocorrências</h1>
          <nav className="breadcrumb">
            <Link href="/" className="breadcrumb-link">Mural</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">Ocorrências</span>
          </nav>
        </div>
        {abertas.length > 0 && (
          <span className="badge badge-danger" style={{ fontSize: '0.875rem', padding: '6px 14px' }}>
            {abertas.length} em aberto
          </span>
        )}
      </div>

      {/* Ocorrências abertas */}
      <div style={{ marginBottom: 32 }}>
        <div className="section-label" style={{ marginBottom: 12 }}>⚠️ Em Aberto ({abertas.length})</div>

        {abertas.length === 0 ? (
          <div className="card">
            <div className="empty-state" style={{ padding: '32px 24px' }}>
              <h3 style={{ color: 'var(--success)' }}>✅ Nenhuma ocorrência em aberto!</h3>
              <p>Todos os problemas foram resolvidos.</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {abertas.map((o) => {
              const g = gravidadeConfig[o.gravidade];
              return (
                <div key={o.id} className={`ocorrencia-card ocorrencia-${o.gravidade.toLowerCase()}`}>
                  <div className="ocorrencia-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className={`badge ${g.badge}`}>{g.label}</span>
                      <span className="badge badge-info">{o.setor.nome}</span>
                    </div>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {new Date(o.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="ocorrencia-descricao">{o.descricao}</p>
                  <div className="ocorrencia-actions">
                    <ResolverOcorrenciaForm ocorrenciaId={o.id} setorId={o.setorId} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ocorrências resolvidas */}
      {resolvidas.length > 0 && (
        <div>
          <div className="section-label" style={{ marginBottom: 12 }}>✅ Resolvidas ({resolvidas.length})</div>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Setor</th>
                    <th>Gravidade</th>
                    <th>Descrição</th>
                    <th>Resolução</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {resolvidas.map((o) => {
                    const g = gravidadeConfig[o.gravidade];
                    return (
                      <tr key={o.id}>
                        <td><span className="badge badge-info">{o.setor.nome}</span></td>
                        <td><span className={`badge ${g.badge}`}>{g.label}</span></td>
                        <td style={{ maxWidth: 260, fontSize: '0.8125rem' }}>{o.descricao}</td>
                        <td style={{ maxWidth: 260, fontSize: '0.8125rem', color: 'var(--success)' }}>
                          {o.resolucao || '—'}
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                          {new Date(o.updatedAt).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
