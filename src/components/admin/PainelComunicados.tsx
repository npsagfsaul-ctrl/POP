import { getComunicados, deletarComunicado } from '@/actions/comunicados';
import Link from 'next/link';

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

export default async function PainelComunicados() {
  // Inclui os já expirados: sumiram do mural, mas ainda precisam poder ser
  // apagados de vez.
  const comunicados = await getComunicados(true);
  const agora = new Date();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
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
                {comunicados.map((c) => {
                  const expirado = !!c.expiresAt && new Date(c.expiresAt) <= agora;
                  return (
                    <tr key={c.id} style={{ opacity: expirado ? 0.5 : 1 }}>
                      <td><span className={`badge ${tipoBadge[c.tipo]}`}>{tipoLabel[c.tipo]}</span></td>
                      <td>
                        {c.setor
                          ? <span className="badge badge-primary">🏷️ {c.setor.nome}</span>
                          : <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Administração</span>}
                      </td>
                      <td style={{ fontWeight: 500 }}>{c.titulo}</td>
                      <td>{c.destaque ? '📌 Sim' : '—'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                        {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('pt-BR') : '—'}
                        {expirado && <span style={{ marginLeft: 6 }}>(saiu do mural)</span>}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                        {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td>
                        <form action={async () => {
                          'use server';
                          await deletarComunicado(c.id);
                        }}>
                          <button type="submit" className="btn btn-danger btn-sm">Excluir</button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
