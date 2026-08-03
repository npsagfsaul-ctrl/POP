'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { selecionarColetor, sairColetor } from '@/actions/coletorSessao';
import { abrirTurno, encerrarTurno } from '@/actions/turnos';

type Periodo = 'MANHA' | 'TARDE' | 'RETORNO';
type Status = 'AGUARDANDO' | 'COLETADO' | 'CANCELADO';

interface Opcao {
  id: string;
  nome: string;
  cor?: string;
  placa?: string | null;
}

interface ColetorAtual {
  id: string;
  nome: string;
  cor: string;
}

interface TurnoAberto {
  id: string;
  veiculoNome: string;
  kmInicial: number;
  liberadoEm: string;
}

interface ColetaItem {
  id: string;
  periodo: Periodo;
  status: Status;
  horaColeta: string | null;
  rotaNome: string | null;
  observacao: string | null;
  naoTeveColeta: boolean;
  clienteNome: string;
  clienteCodigo: string | null;
}

interface Props {
  coletores: Opcao[];
  veiculos: Opcao[];
  coletorAtual: ColetorAtual | null;
  turnoAberto: TurnoAberto | null;
  coletasHoje: ColetaItem[];
}

interface ChecklistItemState {
  ok: boolean;
  obs: string;
}

const PERIODOS: { key: Periodo; label: string }[] = [
  { key: 'MANHA', label: 'Manhã' },
  { key: 'TARDE', label: 'Tarde' },
  { key: 'RETORNO', label: 'Retorno' },
];

const COMBUSTIVEL_OPCOES = ['Cheio', '3/4', '1/2', '1/4', 'Reserva'];

const CHECKLIST_ITENS: { key: 'oleo' | 'agua' | 'pneus' | 'luzes'; label: string }[] = [
  { key: 'oleo', label: 'Óleo' },
  { key: 'agua', label: 'Água / Arrefecimento' },
  { key: 'pneus', label: 'Pneus' },
  { key: 'luzes', label: 'Luzes' },
];

function itemInicial(): ChecklistItemState {
  return { ok: true, obs: '' };
}

export default function ColetorMotoristaApp({ coletores, veiculos, coletorAtual, turnoAberto, coletasHoje }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Checklist inicial
  const [veiculoId, setVeiculoId] = useState('');
  const [kmInicial, setKmInicial] = useState('');
  const [combustivelInicial, setCombustivelInicial] = useState('Cheio');
  const [checklist, setChecklist] = useState<Record<string, ChecklistItemState>>({
    oleo: itemInicial(),
    agua: itemInicial(),
    pneus: itemInicial(),
    luzes: itemInicial(),
  });
  const [observacaoInicial, setObservacaoInicial] = useState('');

  // Encerrar dia
  const [modalEncerrar, setModalEncerrar] = useState(false);
  const [kmFinal, setKmFinal] = useState('');
  const [abastecimentoValor, setAbastecimentoValor] = useState('');
  const [abastecimentoNota, setAbastecimentoNota] = useState('');
  const [problemaCarro, setProblemaCarro] = useState('');

  async function handleSelecionarColetor(id: string) {
    setLoading(true);
    setErro(null);
    try {
      await selecionarColetor(id);
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao selecionar coletor.');
    } finally {
      setLoading(false);
    }
  }

  async function handleTrocarColetor() {
    setLoading(true);
    try {
      await sairColetor();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleLiberarRota() {
    if (!coletorAtual) return;
    setErro(null);
    const km = parseInt(kmInicial, 10);
    if (!veiculoId) { setErro('Selecione o veículo.'); return; }
    if (!Number.isFinite(km) || km < 0) { setErro('Informe o KM inicial.'); return; }

    setLoading(true);
    try {
      await abrirTurno({
        coletorId: coletorAtual.id,
        veiculoId,
        kmInicial: km,
        combustivelInicial,
        oleo: checklist.oleo,
        agua: checklist.agua,
        pneus: checklist.pneus,
        luzes: checklist.luzes,
        observacaoInicial,
      });
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao liberar a rota.');
    } finally {
      setLoading(false);
    }
  }

  async function handleEncerrarDia() {
    if (!turnoAberto) return;
    setErro(null);
    const km = parseInt(kmFinal, 10);
    if (!Number.isFinite(km) || km < turnoAberto.kmInicial) {
      setErro(`KM final deve ser maior ou igual ao inicial (${turnoAberto.kmInicial}).`);
      return;
    }
    setLoading(true);
    try {
      await encerrarTurno(turnoAberto.id, {
        kmFinal: km,
        abastecimentoValor: abastecimentoValor ? parseFloat(abastecimentoValor) : undefined,
        abastecimentoNota: abastecimentoNota || undefined,
        problemaCarro: problemaCarro || undefined,
      });
      setModalEncerrar(false);
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao encerrar o dia.');
    } finally {
      setLoading(false);
    }
  }

  function setItem(key: string, patch: Partial<ChecklistItemState>) {
    setChecklist((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  // ── Passo 1: quem é você? ──
  if (!coletorAtual) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div className="page-header">
          <h1 className="page-title">Quem é você?</h1>
        </div>
        {erro && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{erro}</div>}
        {coletores.length === 0 ? (
          <div className="alert alert-info">Nenhum coletor cadastrado. Peça ao administrador para configurar.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {coletores.map((c) => (
              <button
                key={c.id}
                className="btn btn-secondary btn-lg"
                disabled={loading}
                onClick={() => handleSelecionarColetor(c.id)}
                style={{ borderLeft: `5px solid ${c.cor}`, justifyContent: 'flex-start', fontWeight: 700 }}
              >
                {c.nome}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Passo 2: checklist inicial (liberar rota) ──
  if (!turnoAberto) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Olá, {coletorAtual.nome}!</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Checklist de saída — libere a rota para começar.</p>
          </div>
        </div>

        <button className="btn btn-secondary btn-sm" style={{ marginBottom: 16 }} disabled={loading} onClick={handleTrocarColetor}>
          Trocar coletor
        </button>

        {veiculos.length === 0 ? (
          <div className="alert alert-info">Nenhum veículo cadastrado. Peça ao administrador para configurar em Cadastros.</div>
        ) : (
          <div className="card">
            <div className="form-group">
              <label className="form-label">Veículo *</label>
              <select className="form-select" value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)} required>
                <option value="" disabled>Selecione…</option>
                {veiculos.map((v) => <option key={v.id} value={v.id}>{v.nome}{v.placa ? ` (${v.placa})` : ''}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">KM inicial *</label>
                <input
                  type="number"
                  className="form-input"
                  value={kmInicial}
                  onChange={(e) => setKmInicial(e.target.value)}
                  placeholder="Ex: 45000"
                  min={0}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Combustível *</label>
                <select className="form-select" value={combustivelInicial} onChange={(e) => setCombustivelInicial(e.target.value)}>
                  {COMBUSTIVEL_OPCOES.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Checklist do veículo</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {CHECKLIST_ITENS.map(({ key, label }) => {
                  const item = checklist[key];
                  return (
                    <div key={key} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{label}</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            className={`btn btn-sm ${item.ok ? 'btn-success' : 'btn-secondary'}`}
                            onClick={() => setItem(key, { ok: true, obs: '' })}
                          >
                            OK
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm ${!item.ok ? 'btn-danger' : 'btn-secondary'}`}
                            onClick={() => setItem(key, { ok: false })}
                          >
                            Problema
                          </button>
                        </div>
                      </div>
                      {!item.ok && (
                        <input
                          type="text"
                          className="form-input"
                          style={{ marginTop: 8 }}
                          placeholder={`Descreva o problema em ${label.toLowerCase()}…`}
                          value={item.obs}
                          onChange={(e) => setItem(key, { obs: e.target.value })}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Observação geral</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Algo mais para relatar antes de sair…"
                value={observacaoInicial}
                onChange={(e) => setObservacaoInicial(e.target.value)}
              />
            </div>

            {erro && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{erro}</div>}

            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading} onClick={handleLiberarRota}>
              {loading ? 'Liberando…' : '🚚 Liberar rota'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Passo 3: rota do dia ──
  //
  // Somente leitura: substitui a folha impressa, sempre atualizada. Não tem
  // botão de "Cheguei" — os coletores relataram que parar para marcar no meio
  // da rota não funciona na prática. A marcação continua no escritório, em
  // /coletas. (Decisão da usuária em ago/2026, a partir do retorno da equipe.)
  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">Sua rota hoje</h1>
      </div>

      <div className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 700 }}>{coletorAtual.nome}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {turnoAberto.veiculoNome} · KM {turnoAberto.kmInicial} · liberado às {turnoAberto.liberadoEm}
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" disabled={loading} onClick={handleTrocarColetor}>Trocar coletor</button>
      </div>

      {erro && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{erro}</div>}

      {coletasHoje.length === 0 ? (
        <div className="alert alert-info" style={{ marginBottom: 16 }}>Nenhuma coleta para hoje.</div>
      ) : (
        PERIODOS.map(({ key, label }) => {
          const doPeriodo = coletasHoje.filter((c) => c.periodo === key);
          if (doPeriodo.length === 0) return null;
          return (
            <div key={key} style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 8 }}>{label}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {doPeriodo.map((c) => (
                  <div key={c.id} className="card" style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                      {c.rotaNome && <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>{c.rotaNome}</span>}
                      {c.status === 'COLETADO' && (
                        <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Coletado às {c.horaColeta}</span>
                      )}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {c.clienteNome}
                      {c.clienteCodigo && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> ({c.clienteCodigo})</span>}
                    </div>
                    {c.observacao && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{c.observacao}</div>}
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      <button className="btn btn-danger btn-lg" style={{ width: '100%', marginTop: 8 }} onClick={() => setModalEncerrar(true)}>
        Encerrar dia
      </button>

      {modalEncerrar && (
        <div className="modal-overlay" onClick={() => setModalEncerrar(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Encerrar dia</h3>
              <button className="modal-close" onClick={() => setModalEncerrar(false)}>✕</button>
            </div>

            <div className="form-group">
              <label className="form-label">KM final *</label>
              <input
                type="number"
                className="form-input"
                value={kmFinal}
                onChange={(e) => setKmFinal(e.target.value)}
                min={turnoAberto.kmInicial}
                placeholder={`Mín. ${turnoAberto.kmInicial}`}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Valor abastecido (R$)</label>
                <input
                  type="number"
                  className="form-input"
                  value={abastecimentoValor}
                  onChange={(e) => setAbastecimentoValor(e.target.value)}
                  step="0.01"
                  min={0}
                  placeholder="0,00"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nota / posto</label>
                <input
                  type="text"
                  className="form-input"
                  value={abastecimentoNota}
                  onChange={(e) => setAbastecimentoNota(e.target.value)}
                  placeholder="Ex: nota nº 123"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Problema no carro</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Algum problema para relatar…"
                value={problemaCarro}
                onChange={(e) => setProblemaCarro(e.target.value)}
              />
            </div>

            {erro && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{erro}</div>}

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setModalEncerrar(false)}>Cancelar</button>
              <button type="button" className="btn btn-primary" disabled={loading} onClick={handleEncerrarDia}>
                {loading ? 'Salvando…' : 'Encerrar dia'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
