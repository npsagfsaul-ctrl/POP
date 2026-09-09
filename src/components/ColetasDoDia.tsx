'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarColeta, atualizarColeta, atualizarStatusColeta, deletarColeta } from '@/actions/coletas';
import {
  STATUS_COLETA_LABEL, StatusColetaTexto, CORTE_PEDIDOS, corteJaPassou, corDoColetor,
} from '@/lib/coletasStatus';

type Periodo = 'MANHA' | 'TARDE' | 'RETORNO';
type Tipo = 'FIXA' | 'EXTRA';
type Status = StatusColetaTexto;

interface ColetaItem {
  id: string;
  periodo: Periodo;
  tipo: Tipo;
  status: Status;
  horaColeta: string | null; // HH:mm quando coletada
  criadaEm: string; // HH:mm do cadastro
  rotaNome: string | null; // rota/região, quando veio de rota fixa
  observacao: string | null;
  naoTeveColeta: boolean;
  coletorId: string;
  clienteId: string;
  atendenteId: string | null;
  coletorNome: string;
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
  /** Alterar/excluir/cancelar são do Atendimento Interno (ou do admin). */
  podeGerenciar: boolean;
}

const PERIODOS: { key: Periodo; label: string }[] = [
  { key: 'MANHA', label: 'Manhã' },
  { key: 'TARDE', label: 'Tarde' },
  { key: 'RETORNO', label: 'Retorno' },
];

const STATUS_CFG: Record<Status, { badge: string; bg: string; dot: string }> = {
  AGUARDANDO: { badge: 'badge-warning', bg: 'var(--surface-2)', dot: '#f1b44c' },
  COLETADO: { badge: 'badge-success', bg: 'rgba(52,195,143,0.10)', dot: '#34c38f' },
  CANCELADO: { badge: 'badge-danger', bg: 'rgba(244,106,106,0.10)', dot: '#f46a6a' },
};

/**
 * Preto ou branco por cima da cor do coletor, conforme o quanto ela é clara.
 * A paleta atual é toda escura, então na prática dá branco sempre — a função
 * fica para o dia em que alguém acrescentar um tom claro à paleta.
 */
function corDoTexto(cor: string | null | undefined): string {
  const hex = (cor ?? '').replace('#', '');
  if (hex.length !== 6) return 'var(--text-main)';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#1a1a1a' : '#ffffff';
}

/**
 * Agrupa as coletas por coletor, em ordem alfabética.
 *
 * É como a equipe já enxerga na planilha que imprimem: uma faixa por coletor,
 * com a cor dele. A divisão por período continua sendo a de fora.
 */
function agruparPorColetor(itens: ColetaItem[], idsDosColetores: string[]) {
  const mapa = new Map<string, {
    coletorId: string; coletorNome: string; cor: string; itens: ColetaItem[];
  }>();

  for (const c of itens) {
    if (!mapa.has(c.coletorId)) {
      mapa.set(c.coletorId, {
        coletorId: c.coletorId,
        coletorNome: c.coletorNome,
        cor: corDoColetor(c.coletorId, idsDosColetores),
        itens: [],
      });
    }
    mapa.get(c.coletorId)!.itens.push(c);
  }

  return [...mapa.values()].sort((a, b) => a.coletorNome.localeCompare(b.coletorNome, 'pt-BR'));
}

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

export default function ColetasDoDia({ data, coletas, coletores, atendentes, clientes, podeGerenciar }: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [periodoAtual, setPeriodoAtual] = useState<Periodo>('MANHA');
  const [editando, setEditando] = useState<ColetaItem | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Calculado no cliente (e não na renderização do servidor) porque depende da
  // hora atual — no servidor daria diferença entre o HTML enviado e o montado.
  const [fechado, setFechado] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const agora = new Date();
    const hoje = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
    const ehHoje = data === hoje;
    setFechado({
      MANHA: corteJaPassou('MANHA', agora, ehHoje),
      TARDE: corteJaPassou('TARDE', agora, ehHoje),
      RETORNO: false,
    });
  }, [data]);

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

    // Extra lançada depois do corte pode não alcançar o coletor a tempo — avisa,
    // mas não bloqueia, porque exceção acontece.
    const periodoEscolhido = fd.get('periodo') as Periodo;
    if (!editando && fechado[periodoEscolhido]) {
      const ok = confirm(
        `O horário de pedidos da ${PERIODOS.find((p) => p.key === periodoEscolhido)?.label} era até ${CORTE_PEDIDOS[periodoEscolhido]}.\n\n` +
        'O coletor já saiu com a folha impressa, então esta coleta não está nela — precisa ser avisada por fora.\n\nLançar mesmo assim?',
      );
      if (!ok) return;
    }

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

  async function handleStatus(c: ColetaItem, status: Status) {
    if (status === 'CANCELADO' && !confirm(`Cancelar a coleta de "${c.clienteNome}"?`)) return;
    setLoading(true);
    try {
      await atualizarStatusColeta(c.id, status);
      router.refresh();
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
  // A cor sai da posição do coletor no cadastro inteiro, não só entre os que
  // têm coleta hoje — senão a cor de cada um mudaria conforme o dia.
  const idsDosColetores = coletores.map((c) => c.id);
  const btnMini: React.CSSProperties = { padding: '2px 8px', fontSize: '0.72rem' };

  // As fixas se repetem todo dia — são contexto, não novidade. Ficam recolhidas
  // por padrão e, quando abertas, em linha (não em cartão), senão 44 delas
  // devolvem o problema de rolagem que motivou esta mudança.
  const [fixasAbertas, setFixasAbertas] = useState<Record<string, boolean>>({});
  const [linhaAberta, setLinhaAberta] = useState<string | null>(null);

  // Alterar, excluir e cancelar são do Atendimento Interno. Quem só está
  // consultando a rota vê a lista, mas não mexe nela.
  const botoesDe = (c: ColetaItem) => {
    if (!podeGerenciar) return null;
    return (
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {c.status === 'AGUARDANDO' ? (
          <button className="btn btn-danger btn-sm" style={btnMini} disabled={loading} onClick={() => handleStatus(c, 'CANCELADO')}>Cancelar</button>
        ) : (
          <button className="btn btn-secondary btn-sm" style={btnMini} disabled={loading} onClick={() => handleStatus(c, 'AGUARDANDO')}>↩ Desfazer</button>
        )}
        <button className="btn btn-secondary btn-sm" style={btnMini} onClick={() => abrirEditar(c)}>Editar</button>
        <button className="btn btn-danger btn-sm" style={btnMini} disabled={loading} onClick={() => handleExcluir(c)}>Excluir</button>
      </div>
    );
  };

  /** Linha compacta — usada nas fixas. Abre no clique para ver endereço e agir. */
  const renderLinha = (c: ColetaItem) => {
    const cfg = STATUS_CFG[c.status];
    const riscado = c.naoTeveColeta || c.status === 'CANCELADO';
    const aberta = linhaAberta === c.id;
    return (
      <div key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
        <div
          onClick={() => setLinhaAberta(aberta ? null : c.id)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 2px', cursor: 'pointer' }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
          <span style={{ fontSize: '0.82rem', fontWeight: 600, textDecoration: riscado ? 'line-through' : 'none', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {c.clienteNome}
            {c.clienteCodigo && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> ({c.clienteCodigo})</span>}
          </span>
          {c.tipo !== 'FIXA' && (
            <span className="badge badge-warning" style={{ fontSize: '0.6rem' }}>extra</span>
          )}
          {/* Mesma coluna ATENDENTE da planilha que eles imprimem. */}
          {c.atendenteNome && (
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', flexShrink: 0 }}>
              {c.atendenteNome}
            </span>
          )}
          {c.naoTeveColeta && <span className="badge badge-danger" style={{ fontSize: '0.6rem' }}>sem coleta</span>}
          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{aberta ? '▾' : '▸'}</span>
        </div>
        {aberta && (
          <div style={{ padding: '0 2px 8px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {c.observacao && <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{c.observacao}</div>}
            {c.rotaNome && (
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{c.rotaNome}</div>
            )}
            {botoesDe(c)}
          </div>
        )}
      </div>
    );
  };


  return (
    <div>
      {/* Navegação de data */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
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

      {/* Legenda dos status */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16, padding: '0 4px' }}>
        {(Object.keys(STATUS_CFG) as Status[]).map((s) => (
          <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_CFG[s].dot, display: 'inline-block' }} />
            {STATUS_COLETA_LABEL[s]}
          </span>
        ))}
      </div>

      {/* Colunas dos períodos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {PERIODOS.map(({ key, label }) => {
          const doPeriodo = coletas.filter((c) => c.periodo === key);
          return (
            <div key={key} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  {label}
                  <span className="badge badge-primary" style={{ marginLeft: 6, fontSize: '0.7rem' }}>{doPeriodo.length}</span>
                </div>
                {podeGerenciar && (
                  <button className="btn btn-primary btn-sm" disabled={semCadastro} onClick={() => abrirAdicionar(key)}>+ Coleta</button>
                )}
              </div>
              {CORTE_PEDIDOS[key] && (
                <div style={{ fontSize: '0.72rem', marginBottom: 10, color: fechado[key] ? 'var(--danger)' : 'var(--text-muted)' }}>
                  {fechado[key]
                    ? `Fechado — pedidos eram até ${CORTE_PEDIDOS[key]}`
                    : `Pedidos até ${CORTE_PEDIDOS[key]}`}
                </div>
              )}

              {doPeriodo.length === 0 ? (
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', padding: '8px 0' }}>Nenhuma coleta.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {agruparPorColetor(doPeriodo, idsDosColetores).map((grupo) => {
                    // Extra e ocorrência são o que muda de um dia para o outro —
                    // ficam à vista mesmo com o grupo recolhido. As fixas normais
                    // são contexto: 44 delas abertas devolvem o problema de
                    // rolagem que motivou o recolhimento.
                    const destaques = grupo.itens.filter(
                      (c) => c.tipo !== 'FIXA' || c.naoTeveColeta || c.status === 'CANCELADO',
                    );
                    const chave = `${key}|${grupo.coletorId}`;
                    const aberto = fixasAbertas[chave] ?? false;
                    const extras = grupo.itens.filter((c) => c.tipo !== 'FIXA').length;
                    const ocorrencias = grupo.itens.filter(
                      (c) => c.naoTeveColeta || c.status === 'CANCELADO',
                    ).length;

                    return (
                      <div key={grupo.coletorId}>
                        <div
                          onClick={() => setFixasAbertas((p) => ({ ...p, [chave]: !aberto }))}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                            padding: '5px 8px', borderRadius: 'var(--radius-sm)',
                            // A faixa inteira na cor do coletor, como na planilha
                            // que a equipe imprime — é assim que eles já leem.
                            background: grupo.cor || 'var(--surface-2)',
                            color: corDoTexto(grupo.cor),
                          }}
                        >
                          <span style={{ fontSize: '0.75rem', opacity: 0.75 }}>{aberto ? '▾' : '▸'}</span>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 700, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                            {grupo.coletorNome}
                          </span>
                          <span className="badge badge-primary" style={{ fontSize: '0.62rem' }}>{grupo.itens.length}</span>
                          {extras > 0 && (
                            <span className="badge badge-warning" style={{ fontSize: '0.62rem' }}>
                              {extras} extra{extras > 1 ? 's' : ''}
                            </span>
                          )}
                          {ocorrencias > 0 && (
                            <span className="badge badge-danger" style={{ fontSize: '0.62rem' }}>{ocorrencias}</span>
                          )}
                        </div>

                        {/* A cor continua na lateral das linhas, para a leitura
                            não se perder quando o grupo é longo. */}
                        <div style={{
                          marginTop: 3, paddingLeft: 8,
                          borderLeft: `4px solid ${grupo.cor || 'var(--border)'}`,
                        }}>
                          {(aberto ? grupo.itens : destaques).map(renderLinha)}
                        </div>
                      </div>
                    );
                  })}
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
