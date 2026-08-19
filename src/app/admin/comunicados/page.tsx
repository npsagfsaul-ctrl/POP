import { getComunicados } from '@/actions/comunicados';
import { deletarComunicado } from '@/actions/comunicados';
import { isAdmin } from '@/actions/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const tipoLabel: Record<string, string> = {
  URGENTE: '🚨 Urgente',
  AVISO: '⚠️ Aviso',
  NOVIDADE: '🆕 Novidade',
  INFO: 'ℹ️ Informativo',
};

const tipoBadge: Record<string, string> = {
  URGENTE: 'badge-danger',
  AVISO: 'badge-warning',
  NOVIDADE: 'badge-primary',
  INFO: 'badge-info',
};

export default async function ComunicadosAdminPage() {
  const adminMode = await isAdmin();
  if (!adminMode) redirect('/admin/login');

  // Inclui os já expirados: sumiram do mural, mas o admin ainda precisa
  // conseguir apagar de vez.
  const comunicados = await getComunicados(true);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Gerenciar Comunicados</h1>
          <nav className="breadcrumb">
            <Link href="/" className="breadcrumb-link">Mural</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">Comunicados</span>
          </nav>
        </div>
        <Link href="/admin/comunicados/novo" className="btn btn-primary btn-sm">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Novo Comunicado
        </Link>
      </div>

      {comunicados.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <h3>Nenhum comunicado cadastrado</h3>
            <p>Crie o primeiro comunicado para a equipe.</p>
            <Link href="/admin/comunicados/novo" className="btn btn-primary">Criar Comunicado</Link>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Autor</th>
                  <th>Título</th>
                  <th>Destaque</th>
                  <th>Expira em</th>
                  <th>Criado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {comunicados.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className={`badge ${tipoBadge[c.tipo]}`}>{tipoLabel[c.tipo]}</span>
                    </td>
                    <td>
                      {c.setor
                        ? <span className="badge badge-primary">🏷️ {c.setor.nome}</span>
                        : <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Administração</span>}
                    </td>
                    <td style={{ fontWeight: 500 }}>{c.titulo}</td>
                    <td>{c.destaque ? '📌 Sim' : '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      {c.expiresAt
                        ? new Date(c.expiresAt).toLocaleDateString('pt-BR')
                        : '—'}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td>
                      <form action={async () => {
                        'use server';
                        await deletarComunicado(c.id);
                      }}>
                        <button type="submit" className="btn btn-danger btn-sm">
                          Excluir
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
