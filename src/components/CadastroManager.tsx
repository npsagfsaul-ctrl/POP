'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface CampoCadastro {
  name: string;
  label: string;
  tipo?: 'text' | 'color';
  placeholder?: string;
  obrigatorio?: boolean;
  largura?: number; // flex-grow relativo no formulário
}

export interface ItemCadastro {
  id: string;
  ativo: boolean;
  [key: string]: unknown;
}

interface CadastroManagerProps {
  titulo: string;
  descricao?: string;
  campos: CampoCadastro[];
  itens: ItemCadastro[];
  onCriar: (formData: FormData) => Promise<void>;
  onAtualizar: (id: string, formData: FormData) => Promise<void>;
  onAlternarAtivo: (id: string, ativo: boolean) => Promise<void>;
  onDeletar: (id: string) => Promise<void>;
}

export default function CadastroManager({
  titulo,
  descricao,
  campos,
  itens,
  onCriar,
  onAtualizar,
  onAlternarAtivo,
  onDeletar,
}: CadastroManagerProps) {
  const router = useRouter();
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const corPadrao = '#3b82f6';

  async function executar(fn: () => Promise<void>) {
    setErro(null);
    setCarregando(true);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Ocorreu um erro.');
    } finally {
      setCarregando(false);
    }
  }

  async function handleCriar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    await executar(() => onCriar(fd));
    form.reset();
  }

  async function handleAtualizar(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await executar(() => onAtualizar(id, fd));
    setEditandoId(null);
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-title">
        {titulo}
        <span className="badge badge-primary" style={{ marginLeft: 8, fontSize: '0.75rem' }}>
          {itens.length}
        </span>
      </div>
      {descricao && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: -4, marginBottom: 12 }}>
          {descricao}
        </p>
      )}

      {/* Formulário de adicionar */}
      <form onSubmit={handleCriar} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
        {campos.map((c) => (
          <div key={c.name} style={{ flex: c.tipo === 'color' ? '0 0 auto' : c.largura ?? 1, minWidth: c.tipo === 'color' ? 'auto' : 140 }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>{c.label}</label>
            {c.tipo === 'color' ? (
              <input
                name={c.name}
                type="color"
                defaultValue={corPadrao}
                style={{ width: 48, height: 38, padding: 2, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: 'var(--surface)' }}
              />
            ) : (
              <input
                name={c.name}
                type="text"
                className="form-input"
                placeholder={c.placeholder}
                required={c.obrigatorio}
              />
            )}
          </div>
        ))}
        <button type="submit" className="btn btn-primary btn-sm" disabled={carregando} style={{ height: 38 }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Adicionar
        </button>
      </form>

      {erro && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{erro}</div>}

      {/* Lista */}
      {itens.length === 0 ? (
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Nenhum cadastro ainda.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {itens.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: item.ativo ? 'var(--surface)' : 'var(--surface-2)',
                opacity: item.ativo ? 1 : 0.6,
              }}
            >
              {editandoId === item.id ? (
                <form onSubmit={(e) => handleAtualizar(e, item.id)} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
                  {campos.map((c) => (
                    c.tipo === 'color' ? (
                      <input key={c.name} name={c.name} type="color" defaultValue={(item[c.name] as string) || corPadrao}
                        style={{ width: 42, height: 34, padding: 2, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }} />
                    ) : (
                      <input key={c.name} name={c.name} type="text" className="form-input" style={{ flex: 1, minWidth: 120, height: 34 }}
                        defaultValue={(item[c.name] as string) || ''} placeholder={c.placeholder} required={c.obrigatorio} />
                    )
                  ))}
                  <button type="submit" className="btn btn-success btn-sm" disabled={carregando}>Salvar</button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditandoId(null)}>Cancelar</button>
                </form>
              ) : (
                <>
                  {/* cor (se houver) */}
                  {campos.some((c) => c.tipo === 'color') && (
                    <span style={{ width: 16, height: 16, borderRadius: 4, background: (item['cor'] as string) || corPadrao, flexShrink: 0, border: '1px solid rgba(0,0,0,0.1)' }} />
                  )}
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item['nome'] as string}</span>
                  {item['codigo'] != null && item['codigo'] !== '' && (
                    <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>cód. {item['codigo'] as string}</span>
                  )}
                  {!item.ativo && <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>inativo</span>}

                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setErro(null); setEditandoId(item.id); }}>Editar</button>
                    <button className="btn btn-secondary btn-sm" disabled={carregando}
                      onClick={() => executar(() => onAlternarAtivo(item.id, !item.ativo))}>
                      {item.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                    <button className="btn btn-danger btn-sm" disabled={carregando}
                      onClick={() => { if (confirm(`Excluir "${item['nome']}"?`)) executar(() => onDeletar(item.id)); }}>
                      Excluir
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
