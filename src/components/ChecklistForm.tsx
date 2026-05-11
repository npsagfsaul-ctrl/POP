'use client';

import { salvarChecklist } from '@/actions/checklist';
import { useRef } from 'react';

interface Pop {
  id: string;
  titulo: string;
  peso: number;
  orientacaoAvaliacao: string;
  instrucaoTrabalho: string;
}

interface ChecklistFormProps {
  setorId: string;
  pops: Pop[];
  dataInicial: string;
  respostasIniciais: Record<string, boolean>;
  observacoesInicial?: string;
}

export default function ChecklistForm({
  setorId,
  pops,
  dataInicial,
  respostasIniciais,
  observacoesInicial,
}: ChecklistFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const marcarTodosConforme = () => {
    if (!formRef.current) return;
    const checkboxes = formRef.current.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((cb) => {
      (cb as HTMLInputElement).checked = true;
    });
  };

  return (
    <div className="card">
      <form ref={formRef} action={salvarChecklist}>
        <input type="hidden" name="setorId" value={setorId} />

        {/* Header do form */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 24 }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 200 }}>
            <label htmlFor="data" className="form-label">
              Data do Checklist
            </label>
            <input
              type="date"
              id="data"
              name="data"
              defaultValue={dataInicial}
              className="form-input"
              style={{ maxWidth: 200 }}
              required
            />
          </div>

          <button
            type="button"
            onClick={marcarTodosConforme}
            className="btn btn-success btn-sm"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Tudo Conforme / Nada a Declarar
          </button>
        </div>

        <div className="divider" />

        {/* Lista de POPs */}
        <div style={{ marginBottom: 8 }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 12 }}>
            Procedimentos Operacionais ({pops.length})
          </h3>

          {pops.map((pop) => (
            <div key={pop.id} className="pop-item">
              <input
                type="checkbox"
                id={`pop_${pop.id}`}
                name={`pop_${pop.id}`}
                defaultChecked={respostasIniciais[pop.id] === true}
              />
              <div style={{ flex: 1 }}>
                <label htmlFor={`pop_${pop.id}`} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span className="pop-item-title">{pop.titulo}</span>
                  <span className="badge badge-primary" style={{ fontSize: '0.6875rem' }}>
                    Peso {pop.peso}
                  </span>
                </label>

                <p className="pop-item-desc" style={{ marginTop: 4 }}>
                  <strong style={{ color: 'var(--text-main)' }}>Avaliar:</strong> {pop.orientacaoAvaliacao}
                </p>

                <details style={{ marginTop: 6 }}>
                  <summary style={{ fontSize: '0.8125rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 }}>
                    Ver instrução de trabalho
                  </summary>
                  <div style={{
                    marginTop: 8, padding: '10px 14px',
                    background: 'var(--surface-2)', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)', fontSize: '0.8125rem',
                    color: 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: 1.6
                  }}>
                    {pop.instrucaoTrabalho}
                  </div>
                </details>
              </div>
            </div>
          ))}
        </div>

        <div className="divider" />

        {/* Observações */}
        <div className="form-group">
          <label htmlFor="observacoes" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Observações / Ocorrências do Dia
          </label>
          <textarea
            id="observacoes"
            name="observacoes"
            defaultValue={observacoesInicial || ''}
            placeholder="Descreva irregularidades, falta de material ou observações relevantes..."
            className="form-textarea"
          />
          <p className="form-hint">Campo opcional — preencha caso haja algo a relatar.</p>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
          <button type="submit" className="btn btn-primary btn-lg">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Finalizar Checklist
          </button>
        </div>
      </form>
    </div>
  );
}
