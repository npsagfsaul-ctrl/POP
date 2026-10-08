'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  criarLancamentoHoras,
  deletarLancamentoHoras,
  definirSaldoInicial,
  definirJornada,
} from '@/actions/horas';
import { formatarHoras } from '@/lib/horas';
import {
  formatarBloco,
  minutosDaSemana,
  resumoJornada,
  type Jornada,
  type Periodo,
} from '@/lib/jornada';

/**
 * As quatro batidas do dia, pelos nomes que a agência usa.
 *
 * São os dois períodos da jornada vistos do jeito de quem bate o ponto:
 * chega, sai para o almoço, volta, vai embora. Chamar as quatro de
 * "entrada" e "saída" duas vezes não dizia nada.
 */
const ROTULOS = ['Entrada', 'Saída p/ almoço', 'Volta do almoço', 'Saída'];

/**
 * Um bloco da jornada: até dois períodos, com o total do dia ao lado.
 *
 * O total aparece enquanto a pessoa digita porque é assim que ela percebe o
 * erro na hora — 8h virou 7h porque trocou 19:00 por 18:00.
 */
function BlocoJornada({
  titulo,
  periodos,
  onChange,
}: {
  titulo: string;
  periodos: Periodo[];
  onChange: (p: Periodo[]) => void;
}) {
  const linhas: Periodo[] = [0, 1].map((i) => periodos[i] ?? { entrada: '', saida: '' });

  function trocar(indice: number, campo: 'entrada' | 'saida', valor: string) {
    const novos = linhas.map((p, i) => (i === indice ? { ...p, [campo]: valor } : p));
    // Períodos em branco não vão para o banco; a limpeza final é no servidor.
    onChange(novos);
  }

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }}>
      <div style={{ flex: '1 1 130px', fontWeight: 600, fontSize: '0.875rem', paddingBottom: 10 }}>
        {titulo}
      </div>

      {linhas.map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.7rem' }}>{ROTULOS[i * 2]}</label>
            <input
              type="time"
              className="form-input"
              value={p.entrada}
              onChange={(e) => trocar(i, 'entrada', e.target.value)}
              style={{ width: 110 }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.7rem' }}>{ROTULOS[i * 2 + 1]}</label>
            <input
              type="time"
              className="form-input"
              value={p.saida}
              onChange={(e) => trocar(i, 'saida', e.target.value)}
              style={{ width: 110 }}
            />
          </div>
        </div>
      ))}

      <div style={{ paddingBottom: 10, fontFamily: 'monospace', fontWeight: 700, minWidth: 60, textAlign: 'right' }}>
        {formatarBloco(linhas)}
      </div>
    </div>
  );
}

export interface ColaboradorHoras {
  id: string;
  nome: string;
  setorNome: string | null;
  jornadaNota: string | null;
  jornada: Jornada;
  saldoInicialMinutos: number;
  saldoInicialEm: string | null;
  saldoMinutos: number;
  lancamentos: { id: string; data: string; minutos: number; motivo: string | null }[];
}

function dataBR(iso: string) {
  const [a, m, d] = iso.split('-');
  return d && m && a ? `${d}/${m}/${a}` : iso;
}

function hojeISO() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export default function ControleHorasColaborador({ c }: { c: ColaboradorHoras }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const [saldoTexto, setSaldoTexto] = useState(formatarHoras(c.saldoInicialMinutos, true));
  const [saldoData, setSaldoData] = useState(c.saldoInicialEm ?? '');
  const [jornada, setJornada] = useState<Jornada>(c.jornada);
  const [nota, setNota] = useState(c.jornadaNota ?? '');

  async function executar(fn: () => Promise<unknown>) {
    setErro(null);
    setOcupado(true);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setOcupado(false);
    }
  }

  async function handleLancar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    await executar(async () => {
      await criarLancamentoHoras(c.id, fd);
      form.reset();
    });
  }

  const deve = c.saldoMinutos < 0;

  return (
    <div>
      {/*
        Só o saldo à mostra.

        Lançamentos e jornada ficam fechados: na maior parte das vezes ela vem
        aqui para guardar um número vindo do relatório do ponto, e os outros
        dois blocos deixavam a tela parecendo formulário de cadastro.
      */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div className="stat-label">Saldo</div>
            <div style={{
              fontFamily: 'monospace',
              fontSize: '2rem',
              fontWeight: 700,
              lineHeight: 1.1,
              color: c.saldoMinutos === 0 ? 'var(--text-muted)' : deve ? 'var(--danger)' : 'var(--success)',
            }}>
              {formatarHoras(c.saldoMinutos, true)}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0, flex: '0 1 130px' }}>
            <label className="form-label" htmlFor="saldo">Do relatório</label>
            <input
              id="saldo"
              className="form-input"
              value={saldoTexto}
              onChange={(e) => setSaldoTexto(e.target.value)}
              placeholder="-03:47"
              style={{ fontFamily: 'monospace' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0, flex: '0 1 150px' }}>
            <label className="form-label" htmlFor="saldoData">Data</label>
            <input
              id="saldoData"
              type="date"
              className="form-input"
              value={saldoData}
              onChange={(e) => setSaldoData(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="btn btn-primary"
            disabled={ocupado}
            onClick={() => executar(() => definirSaldoInicial(c.id, saldoTexto, saldoData))}
          >
            Salvar
          </button>
        </div>

        {/* Só aparece quando há lançamento: aí o saldo da tela deixa de ser o
            mesmo que foi digitado, e a diferença precisa de explicação. */}
        {c.lancamentos.length > 0 && (
          <div className="form-hint" style={{ marginTop: 10 }}>
            {formatarHoras(c.saldoInicialMinutos, true)} do relatório
            {c.saldoInicialEm && ` de ${dataBR(c.saldoInicialEm)}`}, mais{' '}
            {c.lancamentos.length} lançamento(s).
          </div>
        )}
      </div>

      {erro && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{erro}</div>}

      <details className="card" style={{ marginBottom: 12 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.9375rem' }}>
          Lançamentos
          {c.lancamentos.length > 0 && (
            <span className="badge badge-primary" style={{ marginLeft: 8, fontSize: '0.75rem' }}>
              {c.lancamentos.length}
            </span>
          )}
        </summary>

        <form onSubmit={handleLancar} style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0, flex: '1 1 140px' }}>
              <label className="form-label" htmlFor="data">Data</label>
              <input id="data" type="date" name="data" className="form-input" defaultValue={hojeISO()} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: '1 1 150px' }}>
              <label className="form-label" htmlFor="sinal">O que foi</label>
              <select id="sinal" name="sinal" className="form-select" defaultValue="mais">
                <option value="mais">Compensou (a mais)</option>
                <option value="menos">Ficou devendo (a menos)</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: '1 1 100px' }}>
              <label className="form-label" htmlFor="tempo">Quanto</label>
              <input id="tempo" name="tempo" className="form-input" placeholder="01:30" required style={{ fontFamily: 'monospace' }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: '2 1 200px' }}>
              <label className="form-label" htmlFor="motivo">Motivo</label>
              <input id="motivo" name="motivo" className="form-input" placeholder="Atestado, abono…" />
            </div>
            <button type="submit" className="btn btn-secondary" disabled={ocupado}>Lançar</button>
          </div>
        </form>

        {c.lancamentos.length > 0 && (
          <div className="table-wrapper" style={{ marginTop: 16 }}>
            <table>
              <tbody>
                {c.lancamentos.map((l) => (
                  <tr key={l.id}>
                    <td>{dataBR(l.data)}</td>
                    <td style={{
                      textAlign: 'right',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      color: l.minutos < 0 ? 'var(--danger)' : 'var(--success)',
                    }}>
                      {formatarHoras(l.minutos, true)}
                    </td>
                    <td>{l.motivo || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        disabled={ocupado}
                        onClick={() => {
                          if (!confirm(`Apagar o lançamento de ${dataBR(l.data)}?`)) return;
                          executar(() => deletarLancamentoHoras(l.id, c.id));
                        }}
                      >
                        Apagar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </details>

      <details className="card">
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.9375rem' }}>
          Jornada
          {minutosDaSemana(jornada) > 0 && (
            <span className="badge badge-primary" style={{ marginLeft: 8, fontSize: '0.75rem' }}>
              {resumoJornada(jornada)}
            </span>
          )}
        </summary>

        <div style={{ marginTop: 16 }}>
          <BlocoJornada
            titulo="Segunda a sexta"
            periodos={jornada.semana}
            onChange={(semana) => setJornada((j) => ({ ...j, semana }))}
          />
          <BlocoJornada
            titulo="Sábado"
            periodos={jornada.sabado}
            onChange={(sabado) => setJornada((j) => ({ ...j, sabado }))}
          />

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 8 }}>
            <div className="form-group" style={{ marginBottom: 0, flex: '1 1 240px' }}>
              <input
                className="form-input"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Observação: estagiária, contrato 44h…"
              />
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={ocupado}
              onClick={() => executar(() => definirJornada(c.id, jornada, nota))}
            >
              Salvar jornada
            </button>
          </div>
        </div>
      </details>
    </div>
  );
}
