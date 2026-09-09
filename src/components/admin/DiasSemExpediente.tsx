'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adicionarDiaSemExpediente, removerDiaSemExpediente } from '@/actions/expediente';

interface Dia { id: string; data: string; descricao: string }

function dataBR(iso: string) {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

export default function DiasSemExpediente({ dias }: { dias: Dia[] }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [novaData, setNovaData] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');

  async function executar(chave: string, fn: () => Promise<unknown>) {
    setOcupado(chave);
    setErro(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div>
      {erro && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{erro}</div>}

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Data</label>
          <input
            type="date"
            className="form-input"
            style={{ maxWidth: 180 }}
            value={novaData}
            onChange={(e) => setNovaData(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
          <label className="form-label">O que foi</label>
          <input
            className="form-input"
            placeholder="Ex.: feriado municipal, falta de energia"
            value={novaDescricao}
            onChange={(e) => setNovaDescricao(e.target.value)}
          />
        </div>
        <button
          className="btn btn-primary btn-sm"
          disabled={!novaData || !novaDescricao.trim() || ocupado === 'add'}
          onClick={() => executar('add', async () => {
            await adicionarDiaSemExpediente(novaData, novaDescricao);
            setNovaData('');
            setNovaDescricao('');
          })}
        >
          Adicionar
        </button>
      </div>

      {dias.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
          Nenhum dia cadastrado. Os feriados nacionais já são reconhecidos sozinhos.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {dias.map((d, i) => (
            <div
              key={d.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 12, flexWrap: 'wrap', padding: '9px 0',
                borderTop: i === 0 ? 'none' : '1px solid var(--border)',
              }}
            >
              <span style={{ fontSize: '0.875rem' }}>
                <strong>{dataBR(d.data)}</strong> · {d.descricao}
              </span>
              <button
                className="btn btn-danger btn-sm"
                disabled={ocupado === d.id}
                onClick={() => executar(d.id, () => removerDiaSemExpediente(d.id))}
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
