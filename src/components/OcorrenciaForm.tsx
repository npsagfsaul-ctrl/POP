'use client';

import { useState } from 'react';
import { criarOcorrencia } from '@/actions/ocorrencias';

interface OcorrenciaFormProps {
  setorId: string;
  setorNome: string;
}

export default function OcorrenciaForm({ setorId, setorNome }: OcorrenciaFormProps) {
  const [aberto, setAberto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set('setorId', setorId);
    await criarOcorrencia(formData);
    setLoading(false);
    setSucesso(true);
    setTimeout(() => {
      setSucesso(false);
      setAberto(false);
    }, 2000);
  }

  return (
    <>
      <button
        className="btn btn-danger btn-sm"
        onClick={() => setAberto(true)}
        type="button"
      >
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Registrar Ocorrência
      </button>

      {aberto && (
        <div className="modal-overlay" onClick={() => setAberto(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ Registrar Ocorrência</h3>
              <button className="modal-close" onClick={() => setAberto(false)}>✕</button>
            </div>
            <p className="modal-setor-label">Setor: <strong>{setorNome}</strong></p>

            {sucesso ? (
              <div className="alert alert-success">
                ✅ Ocorrência registrada com sucesso! O administrador será notificado.
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <input type="hidden" name="setorId" value={setorId} />

                <div className="form-group">
                  <label className="form-label">Descrição do problema *</label>
                  <textarea
                    name="descricao"
                    className="form-textarea"
                    placeholder="Descreva detalhadamente o que ocorreu..."
                    rows={4}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Gravidade *</label>
                  <select name="gravidade" className="form-select" required>
                    <option value="BAIXA">🟢 Baixa — Não afeta operações</option>
                    <option value="MEDIA" selected>🟡 Média — Afeta parcialmente</option>
                    <option value="ALTA">🟠 Alta — Impacto significativo</option>
                    <option value="CRITICA">🔴 Crítica — Operação comprometida</option>
                  </select>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setAberto(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-danger" disabled={loading}>
                    {loading ? 'Registrando...' : 'Registrar Ocorrência'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
