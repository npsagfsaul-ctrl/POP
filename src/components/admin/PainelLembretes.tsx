import { getLembretes, deletarLembrete, criarLembrete } from '@/actions/lembretes';

export default async function PainelLembretes() {
  const lembretes = await getLembretes();

  return (
    <div>
      {/* Formulário de criação */}
      <div className="card" style={{ maxWidth: 680, marginBottom: 24 }}>
        <div className="card-title">📅 Adicionar Lembrete</div>
        <form action={criarLembrete}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="titulo">Título *</label>
              <input
                id="titulo"
                name="titulo"
                type="text"
                className="form-input"
                placeholder="Ex: Treinamento obrigatório"
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="data">Data *</label>
              <input id="data" name="data" type="date" className="form-input" required />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 16 }}>
            <label className="form-label" htmlFor="descricao">Descrição (opcional)</label>
            <input
              id="descricao"
              name="descricao"
              type="text"
              className="form-input"
              placeholder="Detalhes adicionais..."
            />
          </div>

          <button type="submit" className="btn btn-primary btn-sm">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Adicionar Lembrete
          </button>
        </form>
      </div>

      {/* Lista */}
      <div className="card" style={{ padding: 0 }}>
        {lembretes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3>Nenhum lembrete cadastrado</h3>
            <p>Use o formulário acima para adicionar lembretes de datas importantes.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Título</th>
                  <th>Descrição</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {lembretes.map((l) => {
                  const hoje = new Date();
                  hoje.setHours(0, 0, 0, 0);
                  const passou = new Date(l.data) < hoje;

                  return (
                    <tr key={l.id} style={{ opacity: passou ? 0.5 : 1 }}>
                      <td>
                        <span className={`badge ${passou ? 'badge-info' : 'badge-primary'}`}>
                          {new Date(l.data).toLocaleDateString('pt-BR')}
                        </span>
                        {passou && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 6 }}>
                            passado
                          </span>
                        )}
                      </td>
                      <td style={{ fontWeight: 500 }}>{l.titulo}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{l.descricao || '—'}</td>
                      <td>
                        <form action={async () => {
                          'use server';
                          await deletarLembrete(l.id);
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
        )}
      </div>
    </div>
  );
}
