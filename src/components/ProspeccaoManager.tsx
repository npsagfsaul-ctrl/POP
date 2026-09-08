'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarProspeccao, atualizarProspeccao, deletarProspeccao } from '@/actions/prospeccao';
import { STATUS_PROSPECCAO_LABEL, StatusProspeccaoTexto } from '@/lib/prospeccaoStatus';

type Status = StatusProspeccaoTexto;

interface ProspeccaoItem {
  id: string;
  data: string; // yyyy-mm-dd
  nomeCliente: string;
  telefone: string | null;
  oQueVende: string | null;
  status: Status;
  setorId: string;
  atendenteId: string;
  setorNome: string;
  atendenteNome: string;
}

interface Opcao {
  id: string;
  nome: string;
}

interface Props {
  prospeccoes: ProspeccaoItem[];
  setores: Opcao[];
  atendentes: Opcao[];
  filtroSetorId?: string;
  filtroAtendenteId?: string;
  filtroStatus?: string;
  /** Totais de TODOS os registros — os cartões não seguem o filtro da lista. */
  contagemPorStatus: Record<string, number>;
  totalGeral: number;
  totalEmAberto: number;
  diasSemRetorno: number;
}

const STATUS_CONFIG: Record<Status, { label: string; badge: string }> = {
  NOVO: { label: STATUS_PROSPECCAO_LABEL.NOVO, badge: 'badge-primary' },
  CONTATO: { label: STATUS_PROSPECCAO_LABEL.CONTATO, badge: 'badge-info' },
  FECHADO: { label: STATUS_PROSPECCAO_LABEL.FECHADO, badge: 'badge-success' },
  SEM_RETORNO: { label: STATUS_PROSPECCAO_LABEL.SEM_RETORNO, badge: 'badge-warning' },
  NAO_TEM_INTERESSE: { label: STATUS_PROSPECCAO_LABEL.NAO_TEM_INTERESSE, badge: 'badge-danger' },
  SEM_PERFIL: { label: STATUS_PROSPECCAO_LABEL.SEM_PERFIL, badge: 'badge-primary' },
  DADOS_INCORRETO: { label: STATUS_PROSPECCAO_LABEL.DADOS_INCORRETO, badge: 'badge-danger' },
};

function hojeISO() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export default function ProspeccaoManager({
  prospeccoes,
  setores,
  atendentes,
  filtroSetorId,
  filtroAtendenteId,
  filtroStatus,
  contagemPorStatus,
  totalGeral,
  totalEmAberto,
  diasSemRetorno,
}: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<ProspeccaoItem | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const semCadastro = setores.length === 0 || atendentes.length === 0;

  function atualizarFiltro(chave: 'setorId' | 'atendenteId' | 'status', valor: string) {
    const params = new URLSearchParams();
    if (chave === 'setorId' ? valor : filtroSetorId) params.set('setorId', chave === 'setorId' ? valor : filtroSetorId!);
    if (chave === 'atendenteId' ? valor : filtroAtendenteId) params.set('atendenteId', chave === 'atendenteId' ? valor : filtroAtendenteId!);
    if (chave === 'status' ? valor : filtroStatus) params.set('status', chave === 'status' ? valor : filtroStatus!);
    router.push(`/prospeccao?${params.toString()}`);
  }

  const abrirAdicionar = () => {
    setEditando(null);
    setErro(null);
    setAberto(true);
  };

  const abrirEditar = (item: ProspeccaoItem) => {
    setEditando(item);
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
        await atualizarProspeccao(editando.id, fd);
      } else {
        await criarProspeccao(fd);
      }
      fechar();
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  }

  async function handleExcluir(item: ProspeccaoItem) {
    if (!confirm(`Excluir a prospecção de "${item.nomeCliente}"?`)) return;
    setLoading(true);
    try {
      await deletarProspeccao(item.id);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  // Os cartões contam TUDO, vindo do servidor — antes eles somavam a lista já
  // filtrada, o que agora faria a tela esconder números junto com as linhas.
  const contagem = contagemPorStatus;

  return (
    <div>
      {/* Resumo por status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
        {(Object.keys(STATUS_CONFIG) as Status[]).map((s) => (
          <div key={s} className="stat-card" style={{ padding: '12px 14px' }}>
            <div className="stat-label" style={{ fontSize: '0.7rem' }}>{STATUS_CONFIG[s].label}</div>
            <div className="stat-value" style={{ fontSize: '1.3rem' }}>{contagem[s] || 0}</div>
          </div>
        ))}
      </div>

      {/* Filtros + Nova */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Setor</label>
            <select className="form-select" value={filtroSetorId || ''} onChange={(e) => atualizarFiltro('setorId', e.target.value)}>
              <option value="">Todos</option>
              {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Funcionário</label>
            <select className="form-select" value={filtroAtendenteId || ''} onChange={(e) => atualizarFiltro('atendenteId', e.target.value)}>
              <option value="">Todos</option>
              {atendentes.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Status</label>
            <select className="form-select" value={filtroStatus || 'aberto'} onChange={(e) => atualizarFiltro('status', e.target.value)}>
              <option value="aberto">Em aberto (padrão)</option>
              <option value="todas">Todas — histórico completo</option>
              {(Object.keys(STATUS_CONFIG) as Status[]).map((s) => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          </div>
        </div>

        <button className="btn btn-primary btn-sm" disabled={semCadastro} onClick={abrirAdicionar}>
          + Nova Prospecção
        </button>
      </div>

      {semCadastro && (
        <div className="alert alert-info" style={{ marginBottom: 16 }}>
          É preciso ter ao menos um Setor e um Funcionário cadastrados para lançar uma prospecção.
        </div>
      )}

      {/* O que a lista está mostrando, e como ver o resto */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        marginBottom: 10, fontSize: '0.8125rem', color: 'var(--text-muted)',
      }}>
        {filtroStatus === 'aberto' ? (
          <>
            <span>
              Mostrando os <strong style={{ color: 'var(--text-main)' }}>{totalEmAberto} em aberto</strong>
              {totalGeral > totalEmAberto && (
                <> · {totalGeral - totalEmAberto} já resolvidos ficam fora da lista</>
              )}
            </span>
            {totalGeral > totalEmAberto && (
              <button
                className="btn btn-secondary btn-sm"
                style={{ padding: '2px 10px', fontSize: '0.75rem' }}
                onClick={() => atualizarFiltro('status', 'todas')}
              >
                ver todas as {totalGeral}
              </button>
            )}
          </>
        ) : (
          <>
            <span>
              Mostrando{' '}
              <strong style={{ color: 'var(--text-main)' }}>
                {filtroStatus === 'todas'
                  ? `todas as ${totalGeral}`
                  : `só "${STATUS_CONFIG[filtroStatus as Status]?.label ?? filtroStatus}"`}
              </strong>
            </span>
            <button
              className="btn btn-secondary btn-sm"
              style={{ padding: '2px 10px', fontSize: '0.75rem' }}
              onClick={() => atualizarFiltro('status', 'aberto')}
            >
              voltar para os {totalEmAberto} em aberto
            </button>
          </>
        )}
      </div>

      {filtroStatus === 'aberto' && (contagem.SEM_RETORNO ?? 0) > 0 && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: -4, marginBottom: 10 }}>
          &quot;Sem retorno&quot; continua na lista por {diasSemRetorno} dias depois de marcado, para
          dar chance de uma nova tentativa. Depois sai sozinho.
        </p>
      )}

      {/* Tabela */}
      <div className="card overflow-hidden p-0" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Cliente</th>
                <th>Telefone</th>
                <th>O que vende</th>
                <th>Setor</th>
                <th>Funcionário</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {prospeccoes.map((p) => (
                <tr key={p.id}>
                  <td>{new Date(`${p.data}T00:00:00`).toLocaleDateString('pt-BR')}</td>
                  <td style={{ fontWeight: 600 }}>{p.nomeCliente}</td>
                  <td>{p.telefone || '—'}</td>
                  <td>{p.oQueVende || '—'}</td>
                  <td>{p.setorNome}</td>
                  <td>{p.atendenteNome}</td>
                  <td><span className={`badge ${STATUS_CONFIG[p.status].badge}`}>{STATUS_CONFIG[p.status].label}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => abrirEditar(p)}>Editar</button>
                      <button className="btn btn-danger btn-sm" disabled={loading} onClick={() => handleExcluir(p)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
              {prospeccoes.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                    Nenhuma prospecção encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de adicionar/editar */}
      {aberto && (
        <div className="modal-overlay" onClick={fechar}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editando ? 'Editar Prospecção' : 'Nova Prospecção'}</h3>
              <button className="modal-close" onClick={fechar}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Data *</label>
                  <input type="date" name="data" className="form-input" defaultValue={editando?.data ?? hojeISO()} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Status *</label>
                  <select name="status" className="form-select" defaultValue={editando?.status ?? 'NOVO'} required>
                    {(Object.keys(STATUS_CONFIG) as Status[]).map((s) => (
                      <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nome do Cliente *</label>
                <input type="text" name="nomeCliente" className="form-input" defaultValue={editando?.nomeCliente ?? ''} placeholder="Ex: Claudio" required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Telefone</label>
                  <input type="text" name="telefone" className="form-input" defaultValue={editando?.telefone ?? ''} placeholder="Ex: 43 99999-9999" />
                </div>
                <div className="form-group">
                  <label className="form-label">O que vende</label>
                  <input type="text" name="oQueVende" className="form-input" defaultValue={editando?.oQueVende ?? ''} placeholder="Ex: Roupas, Cosméticos..." />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Setor *</label>
                <select name="setorId" className="form-select" defaultValue={editando?.setorId ?? ''} required>
                  <option value="" disabled>Selecione…</option>
                  {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Funcionário *</label>
                <select name="atendenteId" className="form-select" defaultValue={editando?.atendenteId ?? ''} required>
                  <option value="" disabled>Selecione…</option>
                  {atendentes.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>

              {erro && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{erro}</div>}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={fechar}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Salvando…' : editando ? 'Salvar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
