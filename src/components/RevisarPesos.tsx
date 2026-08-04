'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { atualizarPesosEmLote } from '@/actions/pops';

interface PopItem {
  id: string;
  titulo: string;
  peso: number;
  desativado: boolean;
}

interface Props {
  setorId: string;
  pops: PopItem[];
}

/** A régua definida pela gestora — fica à vista enquanto ela revisa. */
const REGUA: { peso: number; rotulo: string; cor: string }[] = [
  { peso: 5, rotulo: 'Afeta o cliente e a agência', cor: 'var(--danger)' },
  { peso: 3, rotulo: 'Afeta só a agência, internamente', cor: '#b37a00' },
  { peso: 2, rotulo: 'Tarefa com prazo a cumprir', cor: 'var(--success)' },
];

export default function RevisarPesos({ setorId, pops }: Props) {
  const router = useRouter();
  const [pesos, setPesos] = useState<Record<string, number>>(
    () => Object.fromEntries(pops.map((p) => [p.id, p.peso])),
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  const alterados = pops.filter((p) => pesos[p.id] !== p.peso);

  const totalAtual = pops.filter((p) => !p.desativado).reduce((a, p) => a + p.peso, 0);
  const totalNovo = pops.filter((p) => !p.desativado).reduce((a, p) => a + (pesos[p.id] ?? p.peso), 0);

  async function salvar() {
    if (alterados.length === 0) return;
    setSalvando(true);
    setErro(null);
    try {
      await atualizarPesosEmLote(
        setorId,
        Object.fromEntries(alterados.map((p) => [p.id, pesos[p.id]])),
      );
      setSalvo(true);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      {/* Régua de referência */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Como decidir o peso</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {REGUA.map((r) => (
            <div key={r.peso} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem' }}>
              <span style={{
                minWidth: 26, height: 26, borderRadius: 6, display: 'grid', placeItems: 'center',
                background: 'var(--surface-2)', border: `2px solid ${r.cor}`, color: r.cor, fontWeight: 700,
              }}>
                {r.peso}
              </span>
              {r.rotulo}
            </div>
          ))}
        </div>
      </div>

      {/* Barra de ação */}
      <div
        className="card"
        style={{
          marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, flexWrap: 'wrap', position: 'sticky', top: 8, zIndex: 5,
        }}
      >
        <div style={{ fontSize: '0.875rem' }}>
          {alterados.length === 0 ? (
            <span style={{ color: 'var(--text-muted)' }}>Nenhuma alteração ainda.</span>
          ) : (
            <>
              <strong>{alterados.length}</strong> POP(s) alterado(s) ·{' '}
              <span style={{ color: 'var(--text-muted)' }}>
                peso do setor: {totalAtual} → <strong style={{ color: 'var(--text-main)' }}>{totalNovo}</strong>
              </span>
            </>
          )}
          {salvo && alterados.length === 0 && (
            <span style={{ color: 'var(--success)', marginLeft: 8 }}>✓ salvo</span>
          )}
        </div>
        <button
          className="btn btn-primary btn-sm"
          disabled={alterados.length === 0 || salvando}
          onClick={salvar}
        >
          {salvando ? 'Salvando…' : `Salvar ${alterados.length || ''}`.trim()}
        </button>
      </div>

      {erro && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{erro}</div>}

      {/* Lista */}
      <div className="card" style={{ padding: 0 }}>
        {pops.map((pop, i) => {
          const atual = pesos[pop.id] ?? pop.peso;
          const mudou = atual !== pop.peso;
          // POP com peso fora da régua (ex.: o de peso 10) ganha um botão próprio,
          // senão não haveria como manter o valor atual sem alterá-lo.
          const opcoes = REGUA.map((r) => r.peso);
          if (!opcoes.includes(pop.peso)) opcoes.push(pop.peso);

          return (
            <div
              key={pop.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                padding: '10px 16px',
                borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                background: mudou ? 'var(--warning-light)' : undefined,
                opacity: pop.desativado ? 0.55 : 1,
              }}
            >
              <div style={{ flex: 1, minWidth: 240, fontSize: '0.875rem' }}>
                {pop.titulo}
                {pop.desativado && (
                  <span className="badge badge-warning" style={{ marginLeft: 6, fontSize: '0.65rem' }}>
                    desativado
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 4 }}>
                {opcoes.sort((a, b) => b - a).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPesos((prev) => ({ ...prev, [pop.id]: p }))}
                    className={`btn btn-sm ${atual === p ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ minWidth: 38, padding: '2px 8px' }}
                    title={REGUA.find((r) => r.peso === p)?.rotulo}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {mudou && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: 54 }}>
                  era {pop.peso}
                </span>
              )}
            </div>
          );
        })}
        {pops.length === 0 && (
          <p style={{ padding: 20, color: 'var(--text-muted)' }}>Nenhum POP cadastrado neste setor.</p>
        )}
      </div>
    </div>
  );
}
