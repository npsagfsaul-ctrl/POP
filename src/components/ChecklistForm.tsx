'use client';

import { salvarChecklist } from '@/actions/checklist';
import { useRef, useState } from 'react';

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

  // Domingos não contam para a meta e não aparecem no calendário do setor,
  // então bloqueamos a seleção aqui para não gerar um checklist "invisível".
  const [dataChecklist, setDataChecklist] = useState(dataInicial);
  const handleDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novaData = e.target.value;
    if (!novaData) return;
    const isDomingo = new Date(`${novaData}T00:00:00`).getDay() === 0;
    if (isDomingo) {
      alert('Não é possível preencher checklist aos domingos — domingos não contam para a meta.');
      return; // mantém a data anterior (input controlado, não avança)
    }
    setDataChecklist(novaData);
  };
  const isDomingoSelecionado = dataChecklist
    ? new Date(`${dataChecklist}T00:00:00`).getDay() === 0
    : false;

  // Inicializar estado das ocorrências (false no DB = ocorrência = true na UI)
  const [ocorrencias, setOcorrencias] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    pops.forEach(pop => {
      // Se tiver uma resposta explicitamente false no BD, é uma ocorrência.
      init[pop.id] = respostasIniciais[pop.id] === false;
    });
    return init;
  });

  // Extrair descrições antigas se houver
  const [descricoes, setDescricoes] = useState<Record<string, string>>(() => {
    const initDesc: Record<string, string> = {};
    let text = observacoesInicial || '';
    
    pops.forEach(pop => {
      const startMarker = `[Ocorrência - ${pop.titulo}]\n`;
      const endMarker = `\n[Fim Ocorrência]`;
      const startIdx = text.indexOf(startMarker);
      if (startIdx !== -1) {
        const endIdx = text.indexOf(endMarker, startIdx);
        if (endIdx !== -1) {
          initDesc[pop.id] = text.substring(startIdx + startMarker.length, endIdx);
          text = text.substring(0, startIdx) + text.substring(endIdx + endMarker.length);
        }
      }
    });
    return initDesc;
  });

  const [obsGlobal, setObsGlobal] = useState(() => {
    let text = observacoesInicial || '';
    pops.forEach(pop => {
      const startMarker = `[Ocorrência - ${pop.titulo}]\n`;
      const endMarker = `\n[Fim Ocorrência]`;
      while(true) {
        const startIdx = text.indexOf(startMarker);
        if (startIdx === -1) break;
        const endIdx = text.indexOf(endMarker, startIdx);
        if (endIdx === -1) break;
        text = text.substring(0, startIdx) + text.substring(endIdx + endMarker.length);
      }
    });
    return text.trim();
  });

  // Toggle "Sem ocorrência"
  const [semOcorrencia, setSemOcorrencia] = useState(() => {
    // Se não há nenhuma ocorrência marcada inicialmente
    return pops.every(pop => respostasIniciais[pop.id] !== false);
  });

  const handleToggleSemOcorrencia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    if (isChecked) {
      // Verifica se tem alguma ocorrência marcada
      const temOcorrenciaMarcada = Object.values(ocorrencias).some(v => v);
      if (temOcorrenciaMarcada) {
        alert("A operação não pode ser feita pois foi escolhido sem ocorrência e com uma ocorrência.");
        return; // não deixa marcar
      }
    }
    setSemOcorrencia(isChecked);
  };

  const handleCheckboxOcorrencia = (popId: string, isChecked: boolean) => {
    if (semOcorrencia && isChecked) {
      alert("A operação não pode ser feita pois foi escolhido sem ocorrência e com uma ocorrência. Desmarque 'Sem ocorrência' primeiro.");
      return;
    }
    setOcorrencias(prev => ({ ...prev, [popId]: isChecked }));
  };

  const handleDescricaoChange = (popId: string, val: string) => {
    setDescricoes(prev => ({ ...prev, [popId]: val }));
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
              value={dataChecklist}
              onChange={handleDataChange}
              className="form-input"
              style={{ maxWidth: 200 }}
              required
            />
            {isDomingoSelecionado && (
              <p style={{ color: 'var(--danger, #dc2626)', fontSize: '0.8125rem', marginTop: 6 }}>
                ⚠ Domingos não contam para a meta — escolha outro dia.
              </p>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--success-light, #ecfdf5)', border: '1px solid var(--success, #10b981)', borderRadius: 'var(--radius-md)' }}>
            <input 
              type="checkbox" 
              id="semOcorrencia" 
              checked={semOcorrencia}
              onChange={handleToggleSemOcorrencia}
              style={{ width: 18, height: 18, cursor: 'pointer' }}
            />
            <label htmlFor="semOcorrencia" style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--success-dark, #047857)' }}>
              Sem ocorrência
            </label>
          </div>
        </div>

        <div className="divider" />

        {/* Lista de POPs */}
        <div style={{ marginBottom: 8 }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 12 }}>
            Procedimentos Operacionais ({pops.length})
          </h3>

          {pops.map((pop) => (
            <div key={pop.id} className="pop-item" style={{ opacity: semOcorrencia ? 0.6 : 1, transition: 'opacity 0.2s' }}>
              <input
                type="checkbox"
                id={`pop_${pop.id}`}
                name={`pop_${pop.id}`}
                checked={ocorrencias[pop.id] || false}
                onChange={(e) => handleCheckboxOcorrencia(pop.id, e.target.checked)}
                disabled={semOcorrencia}
              />
              <div style={{ flex: 1 }}>
                <label htmlFor={`pop_${pop.id}`} style={{ cursor: semOcorrencia ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span className="pop-item-title" style={{ color: ocorrencias[pop.id] ? 'var(--danger, #dc2626)' : 'inherit' }}>
                    {pop.titulo} {ocorrencias[pop.id] && <span style={{fontSize:'0.75rem', color:'var(--danger, #dc2626)', fontWeight: 'bold'}}>(Ocorrência)</span>}
                  </span>
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

                {/* Textarea para descrição se houver ocorrência */}
                {ocorrencias[pop.id] && (
                  <div style={{ marginTop: 12 }}>
                    <label htmlFor={`desc_pop_${pop.id}`} className="form-label" style={{ color: 'var(--danger, #dc2626)', fontWeight: 600 }}>
                      Descreva o caso/problema (Obrigatório)
                    </label>
                    <textarea
                      id={`desc_pop_${pop.id}`}
                      name={`desc_pop_${pop.id}`}
                      value={descricoes[pop.id] || ''}
                      onChange={(e) => handleDescricaoChange(pop.id, e.target.value)}
                      placeholder="Detalhes da ocorrência..."
                      className="form-textarea"
                      style={{ border: '1px solid var(--danger, #dc2626)', minHeight: 80 }}
                      disabled={semOcorrencia}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Global observations if they previously existed (for continuity), otherwise hide */}
        {obsGlobal && (
          <>
            <div className="divider" />
            <div className="form-group">
              <label htmlFor="observacoes_globais" className="form-label">
                Observações Adicionais Anteriores
              </label>
              <textarea
                id="observacoes_globais"
                name="observacoes_globais"
                value={obsGlobal}
                onChange={(e) => setObsGlobal(e.target.value)}
                className="form-textarea"
              />
            </div>
          </>
        )}

        <div className="divider" />

        {/* Submit */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
          <button type="submit" className="btn btn-primary btn-lg" disabled={isDomingoSelecionado}>
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
