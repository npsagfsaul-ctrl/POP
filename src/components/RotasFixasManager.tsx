'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  criarRotaFixa, atualizarRotaFixa, alternarRotaFixaAtivo, deletarRotaFixa,
} from '@/actions/rotasFixas';
import { DIAS_SEMANA_LABEL, formatarDias } from '@/lib/coletasStatus';

type Periodo = 'MANHA' | 'TARDE' | 'RETORNO';

interface RotaFixaItem {
  id: string;
  periodo: Periodo;
  dias: number[];
  observacao: string | null;
  ativo: boolean;
  coletorId: string;
  clienteId: string;
  coletorNome: string;
  coletorCor: string;
  clienteNome: string;
  clienteCodigo: string | null;
}

interface Opcao {
  id: string;
  nome: string;
  cor?: string;
  codigo?: string | null;
}

interface Props {
  rotas: RotaFixaItem[];
  coletores: Opcao[];
  clientes: Opcao[];
}

const PERIODO_LABEL: Record<Periodo, string> = {
  MANHA: 'Manhã',
  TARDE: 'Tarde',
  RETORNO: 'Retorno',
};

export default function RotasFixasManager({ rotas, coletores, clientes }: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<RotaFixaItem | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const semCadastro = coletores.length === 0 || clientes.length === 0;

  const abrirAdicionar = () => {
    setEditando(null);
    setErro(null);
    setAberto(true);
  };

  const abrirEditar = (r: RotaFixaItem) => {
    setEditando(r);
    setErro(null);
    setAberto(true);
  };

  const fechar = () => {
    setAberto(false);
    setEditando(null);
  };

  async function executar(fn: () => Promise<void>) {
    setLoading(true);
    setErro(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Ocorreu um erro.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    setErro(null);
    try {
      if (editando) {
        await atualizarRotaFixa(editando.id, fd);
      } else {
        await criarRotaFixa(fd);
      }
      fechar();
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span>
          Rotas Fixas
          <span className="badge badge-primary" style={{ marginLeft: 8, fontSize: '0.75rem' }}>{rotas.length}</span>
        </span>
        <button className="btn btn-primary btn-sm" disabled={semCadastro} onClick={abrirAdicionar}>+ Rota Fixa</button>
      </div>
      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: -4, marginBottom: 12 }}>
        Coletas recorrentes: aparecem automaticamente nas Coletas do Dia nos dias marcados, já como tipo &quot;Fixa&quot;.
        Se a rota for cadastrada hoje, ela passa a valer a partir de amanhã (ou adicione manualmente a de hoje).
      </p>

      {erro && !aberto && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{erro}</div>}

      {rotas.length === 0 ? (
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Nenhuma rota fixa cadastrada ainda.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rotas.map((r) => (
            <div
              key={r.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                borderLeft: `4px solid ${r.coletorCor}`,
                background: r.ativo ? 'var(--surface)' : 'var(--surface-2)',
                opacity: r.ativo ? 1 : 0.6,
              }}
            >
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: r.coletorCor }}>{r.coletorNome}</span>
              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                {r.clienteNome}
                {r.clienteCodigo && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> ({r.clienteCodigo})</span>}
              </span>
              <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>{PERIODO_LABEL[r.periodo]}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatarDias(r.dias)}</span>
              {!r.ativo && <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>inativa</span>}

              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => abrirEditar(r)}>Editar</button>
                <button className="btn btn-secondary btn-sm" disabled={loading}
                  onClick={() => executar(() => alternarRotaFixaAtivo(r.id, !r.ativo))}>
                  {r.ativo ? 'Desativar' : 'Ativar'}
                </button>
                <button className="btn btn-danger btn-sm" disabled={loading}
                  onClick={() => { if (confirm(`Excluir a rota fixa de "${r.clienteNome}"?`)) executar(() => deletarRotaFixa(r.id)); }}>
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de adicionar/editar */}
      {aberto && (
        <div className="modal-overlay" onClick={fechar}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editando ? 'Editar Rota Fixa' : 'Nova Rota Fixa'}</h3>
              <button className="modal-close" onClick={fechar}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Coletor *</label>
                <select name="coletorId" className="form-select" defaultValue={editando?.coletorId ?? ''} required>
                  <option value="" disabled>Selecione…</option>
                  {coletores.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Cliente / Empresa *</label>
                <select name="clienteId" className="form-select" defaultValue={editando?.clienteId ?? ''} required>
                  <option value="" disabled>Selecione…</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}{c.codigo ? ` (${c.codigo})` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Período *</label>
                <select name="periodo" className="form-select" defaultValue={editando?.periodo ?? 'MANHA'} required>
                  {(Object.keys(PERIODO_LABEL) as Periodo[]).map((p) => (
                    <option key={p} value={p}>{PERIODO_LABEL[p]}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Dias da semana *</label>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {[1, 2, 3, 4, 5, 6].map((d) => (
                    <label key={d} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        name={`dia_${d}`}
                        defaultChecked={editando ? editando.dias.includes(d) : true}
                        style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }}
                      />
                      {DIAS_SEMANA_LABEL[d]}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Observação</label>
                <textarea
                  name="observacao"
                  className="form-textarea"
                  rows={2}
                  placeholder="Ex: caixa e estoque / fecha 17:30…"
                  defaultValue={editando?.observacao ?? ''}
                />
              </div>

              {erro && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{erro}</div>}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={fechar}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Salvando…' : editando ? 'Salvar' : 'Adicionar Rota Fixa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
