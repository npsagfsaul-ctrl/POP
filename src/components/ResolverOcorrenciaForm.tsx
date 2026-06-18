'use client';

import { useState } from 'react';
import { resolverOcorrencia } from '@/actions/ocorrencias';

interface ResolverFormProps {
  ocorrenciaId: string;
  setorId: string;
}

export default function ResolverOcorrenciaForm({ ocorrenciaId, setorId }: ResolverFormProps) {
  const [aberto, setAberto] = useState(false);
  const [resolucao, setResolucao] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await resolverOcorrencia(ocorrenciaId, resolucao, setorId);
    setLoading(false);
    setAberto(false);
  }

  if (!aberto) {
    return (
      <button className="btn btn-success btn-sm" onClick={() => setAberto(true)} type="button">
        ✓ Resolver
      </button>
    );
  }

  return (
    <div className="modal-overlay" onClick={() => setAberto(false)}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>✓ Resolver Ocorrência</h3>
          <button className="modal-close" onClick={() => setAberto(false)}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Comentário de resolução *</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Descreva como o problema foi resolvido..."
              value={resolucao}
              onChange={(e) => setResolucao(e.target.value)}
              required
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setAberto(false)}>Cancelar</button>
            <button type="submit" className="btn btn-success" disabled={loading}>
              {loading ? 'Salvando...' : 'Marcar como Resolvido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
