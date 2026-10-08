'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { salvarSaldosEmLote } from '@/actions/horas';
import { formatarHoras, parseHoras } from '@/lib/horas';

export interface LinhaColaborador {
  id: string;
  nome: string;
  saldoMinutos: number;
}

export interface GrupoSetor {
  setor: string;
  colaboradores: LinhaColaborador[];
}

function hojeISO() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/**
 * A lista do fechamento: digita os saldos de todo mundo de cima para baixo e
 * salva uma vez só.
 *
 * Uma data no topo para todos, porque o fechamento é de uma data só. Linha
 * deixada em branco não é mexida — assim dá para fazer metade hoje e metade
 * amanhã sem zerar ninguém.
 */
export default function SaldosEmLote({ grupos }: { grupos: GrupoSetor[] }) {
  const router = useRouter();
  const [data, setData] = useState(hojeISO());
  const [valores, setValores] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvos, setSalvos] = useState<number | null>(null);

  const todos = grupos.flatMap((g) => g.colaboradores);

  const preenchidos = Object.entries(valores).filter(([, v]) => v.trim() !== '');
  const invalidos = preenchidos.filter(([, v]) => parseHoras(v) === null).length;

  async function salvarTudo() {
    setErro(null);
    setSalvos(null);
    setSalvando(true);
    try {
      const entradas = preenchidos.map(([id, texto]) => ({
        id,
        nome: todos.find((c) => c.id === id)?.nome ?? '',
        texto,
      }));
      const n = await salvarSaldosEmLote(data, entradas);
      setValores({});
      setSalvos(n);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ marginBottom: 0, flex: '0 1 170px' }}>
          <label className="form-label" htmlFor="dataFechamento">Data do fechamento</label>
          <input
            id="dataFechamento"
            type="date"
            className="form-input"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </div>

        <button
          type="button"
          className="btn btn-primary"
          disabled={salvando || preenchidos.length === 0 || invalidos > 0}
          onClick={salvarTudo}
        >
          {salvando ? 'Salvando…' : `Salvar ${preenchidos.length || ''}`.trim()}
        </button>

        {invalidos > 0 && (
          <span style={{ color: 'var(--danger)', fontSize: '0.8125rem' }}>
            {invalidos} saldo(s) mal escrito(s) — use 03:14 ou -03:14
          </span>
        )}
        {salvos !== null && (
          <span style={{ color: 'var(--success)', fontSize: '0.8125rem' }}>
            {salvos} saldo(s) guardado(s).
          </span>
        )}
      </div>

      {erro && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{erro}</div>}

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Colaborador</th>
                <th style={{ textAlign: 'right' }}>Saldo hoje</th>
                <th style={{ textAlign: 'left' }}>Novo saldo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {grupos.map((g) => (
                <Fragment key={g.setor || 'sem-setor'}>
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        background: 'var(--surface-2)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {g.setor || 'Sem setor'}
                    </td>
                  </tr>

                  {g.colaboradores.map((c) => {
                    const valor = valores[c.id] ?? '';
                    const digitado = valor.trim() === '' ? null : parseHoras(valor);
                    const ruim = valor.trim() !== '' && digitado === null;
                    const deve = c.saldoMinutos < 0;

                    /**
                     * O que foi digitado já sai colorido, na mesma regra do
                     * saldo atual: esquecer o sinal de menos é o erro fácil de
                     * cometer aqui, e ele vira verde onde devia ser vermelho.
                     * Lado a lado, a cor trocada salta aos olhos.
                     */
                    const corDigitada =
                      digitado === null ? undefined
                        : digitado < 0 ? 'var(--danger)'
                        : digitado > 0 ? 'var(--success)'
                        : 'var(--text-muted)';
                    return (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}>{c.nome}</td>
                        <td style={{
                          textAlign: 'right',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          color: c.saldoMinutos === 0 ? 'var(--text-muted)' : deve ? 'var(--danger)' : 'var(--success)',
                        }}>
                          {formatarHoras(c.saldoMinutos, true)}
                        </td>
                        <td>
                          <input
                            className="form-input"
                            value={valor}
                            onChange={(e) => setValores((v) => ({ ...v, [c.id]: e.target.value }))}
                            placeholder="-03:14"
                            aria-label={`Novo saldo de ${c.nome}`}
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              width: 110,
                              color: corDigitada,
                              borderColor: ruim ? 'var(--danger)' : undefined,
                            }}
                          />
                          {digitado !== null && digitado > 0 && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              a receber
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Link href={`/horas/${c.id}`} className="btn btn-outline btn-sm">Abrir</Link>
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
