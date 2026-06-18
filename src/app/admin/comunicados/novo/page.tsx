import { isAdmin } from '@/actions/admin';
import { criarComunicado } from '@/actions/comunicados';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function NovoComunicadoPage() {
  const adminMode = await isAdmin();
  if (!adminMode) redirect('/admin/login');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Novo Comunicado</h1>
          <nav className="breadcrumb">
            <Link href="/" className="breadcrumb-link">Mural</Link>
            <span className="breadcrumb-sep">›</span>
            <Link href="/admin/comunicados" className="breadcrumb-link">Comunicados</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">Novo</span>
          </nav>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 680 }}>
        <form action={criarComunicado}>
          <div className="form-group">
            <label className="form-label" htmlFor="tipo">Tipo de Comunicado *</label>
            <select id="tipo" name="tipo" className="form-select" required>
              <option value="AVISO">⚠️ Aviso — Atenção necessária</option>
              <option value="NOVIDADE">🆕 Novidade — Informação nova</option>
              <option value="URGENTE">🚨 Urgente — Ação imediata</option>
              <option value="INFO">ℹ️ Informativo — Comunicação geral</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="titulo">Título *</label>
            <input
              id="titulo"
              name="titulo"
              type="text"
              className="form-input"
              placeholder="Ex: Reunião de equipe na sexta-feira"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="conteudo">Conteúdo *</label>
            <textarea
              id="conteudo"
              name="conteudo"
              className="form-textarea"
              placeholder="Descreva o comunicado com detalhes..."
              rows={5}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="expiresAt">Data de Expiração</label>
              <input
                id="expiresAt"
                name="expiresAt"
                type="date"
                className="form-input"
              />
              <span className="form-hint">Deixe em branco para não expirar.</span>
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 28 }}>
              <input
                id="destaque"
                name="destaque"
                type="checkbox"
                style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
              <label htmlFor="destaque" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
                📌 Fixar no topo do mural
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <Link href="/admin/comunicados" className="btn btn-secondary">
              Cancelar
            </Link>
            <button type="submit" className="btn btn-primary">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Publicar Comunicado
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
