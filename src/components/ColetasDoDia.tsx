'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarColeta, atualizarColeta, deletarColeta } from '@/actions/coletas';

type Periodo = 'MANHA' | 'TARDE' | 'RETORNO';
type Tipo = 'FIXA' | 'EXTRA';

interface ColetaItem {
  id: string;
  periodo: Periodo;
  tipo: Tipo;
  observacao: string | null;
  naoTeveColeta: boolean;
  coletorId: string;
  clienteId: string;
  atendenteId: string | null;
  coletorNome: string;
  coletorCor: string;
  clienteNome: string;
  clienteCodigo: string | null;
  atendenteNome: string | null;
}

interface Opcao {
  id: string;
  nome: string;
  cor?: string;
  codigo?: string | null;
}

interface Props {
  data: string; // yyyy-mm-dd
  coletas: ColetaItem[];
  coletores: Opcao[];
  atendentes: Opcao[];
  clientes: Opcao[];
}

const PERIODOS: { key: Periodo; label: string }[] = [
  { key: 'MANHA', label: 'Manhã' },
  { key: 'TARDE', label: 'Tarde' },
  { key: 'RETORNO', label: 'Retorno' },
];

function shiftData(dataStr: string, delta: number) {
  const [y, m, d] = dataStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function formatarData(dataStr: string) {
  const [y, m, d] = dataStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

export default function ColetasDoDia({ data, coletas, coletores, atendentes, clientes }: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [periodoAtual, setPeriodoAtual] = useState<Periodo>('MANHA');
  const [editando, setEditando] = useState<ColetaItem | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const irParaData = (novaData: string) => router.push(`/coletas?data=${novaData}`);

  const abrirAdicionar = (periodo: Periodo) => {
    setEditando(null);
    setPeriodoAtual(periodo);
    setErro(null);
    setAberto(true);
  };

  const abrirEditar = (c: ColetaItem) => {
    setEditando(c);
    setPeriodoAtual(c.periodo);
    setErro(null);
    setAberto(true);
  };

  const fechar = () => {
    setAberto(false);
    setEditando(null);
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    setErro(null);
    try {
      if (editando) {
        await atualizarColeta(editando.id, fd);
      } else {
        fd.set('data', data);
        await criarColeta(fd);
      }
      fechar();
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  }

  async function handleExcluir(c: ColetaItem) {
    if (!confirm(`Excluir a coleta de "${c.clienteNome}"?`)) return;
    setLoading(true);
    try {
      await deletarColeta(c.id);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const semCadastro = coletores.length === 0 || clientes.length === 0;

  return (
    <div>
      {/* Navegação de data */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div style={{ textTransform: 'capitalize', fontWeight: 600, color: 'var(--text-main)' }}>
          {formatarData(data)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => irParaData(shiftData(data, -1))}>← Dia anterior</button>
          <input
            type="date"
            className="form-input"
            value={data}
            onChange={(e) => e.target.value && irParaData(e.target.value)}
            style={{ width: 'auto', height: 36 }}
          />
          <button className="btn btn-secondary btn-sm" onClick={() => irParaData(shiftData(data, 1))}>Próximo dia →</button>
        </div>
      </div>

      {/* Colunas dos períodos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {PERIODOS.map(({ key, label }) => {
          const doPeriodo = coletas.filter((c) => c.periodo === key);
          return (
            <div key={key} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  {label}
                  <span className="badge badge-primary" style={{ marginLeft: 6, fontSize: '0.7rem' }}>{doPeriodo.length}</span>
                </div>
                <button className="btn btn-primary btn-sm" disabled={semCadastro} onClick={() => abrirAdicionar(key)}>+ Coleta</button>
              </div>

              {doPeriodo.length === 0 ? (
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', padding: '8px 0' }}>Nenhuma coleta.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {doPeriodo.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        borderLeft: `4px solid ${c.coletorCor}`,
                        background: 'var(--surface-2)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px 10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: c.coletorCor }}>{c.coletorNome}</span>
                        <span className={`badge ${c.tipo === 'FIXA' ? 'badge-info' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                          {c.tipo === 'FIXA' ? 'Fixa' : 'Extra'}
                        </span>
                        {c.naoTeveColeta && <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>não teve coleta</span>}
                      </div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, textDecoration: c.naoTeveColeta ? 'line-through' : 'none' }}>
                        {c.clienteNome}
                        {c.clienteCodigo && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> ({c.clienteCodigo})</span>}
                      </div>
                      {c.observacao && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{c.observacao}</div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {c.atendenteNome ? `por ${c.atendenteNome}` : '—'}
                        </span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: '0.72rem' }} onClick={() => abrirEditar(c)}>Editar</button>
                          <button className="btn btn-danger btn-sm" style={{ padding: '2px 8px', fontSize: '0.72rem' }} onClick={() => handleExcluir(c)}>Excluir</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal de adicionar/editar */}
      {aberto && (
        <div className="modal-overlay" onClick={fechar}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editando ? 'Editar Coleta' : 'Nova Coleta'}</h3>
              <button className="modal-close" onClick={fechar}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Período *</label>
                  <select name="periodo" className="form-select" defaultValue={periodoAtual} required>
                    {PERIODOS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tipo *</label>
                  <select name="tipo" className="form-select" defaultValue={editando?.tipo ?? 'EXTRA'} required>
                    <option value="EXTRA">Extra (avulsa do dia)</option>
                    <option value="FIXA">Fixa (rota recorrente)</option>
                  </select>
                </div>
              </div>

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
                <label className="form-label">Funcionário</label>
                <select name="atendenteId" className="form-select" defaultValue={editando?.atendenteId ?? ''}>
                  <option value="">— (não informado)</option>
                  {atendentes.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Observação</label>
                <textarea
                  name="observacao"
                  className="form-textarea"
                  rows={2}
                  placeholder="Ex: 10 volumes / levar saquinhos / endereço…"
                  defaultValue={editando?.observacao ?? ''}
                />
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  id="naoTeveColeta"
                  name="naoTeveColeta"
                  type="checkbox"
                  defaultChecked={editando?.naoTeveColeta ?? false}
                  style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                <label htmlFor="naoTeveColeta" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
                  Marcar como &quot;não teve coleta&quot;
                </label>
              </div>

              {erro && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{erro}</div>}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={fechar}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Salvando…' : editando ? 'Salvar' : 'Adicionar Coleta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
