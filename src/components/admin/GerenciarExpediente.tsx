'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  adicionarDiaSemExpediente, removerDiaSemExpediente,
  semearFeriadosNacionais, definirExpedienteValeDe,
} from '@/actions/expediente';
import { formatarDiasExpediente } from '@/lib/expediente';

interface Dia { id: string; data: string; descricao: string }
interface SetorResumo { id: string; nome: string; diasExpediente: string }

const NOMES_MES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function dataBR(iso: string) {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

export default function GerenciarExpediente({
  dias, setores, valeDe, hojeISO,
}: {
  dias: Dia[];
  setores: SetorResumo[];
  valeDe: string | null;
  hojeISO: string;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [novaData, setNovaData] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [mesCorte, setMesCorte] = useState(valeDe ?? hojeISO.slice(0, 7));

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

  const futuros = dias.filter((d) => d.data >= hojeISO);
  const passados = dias.filter((d) => d.data < hojeISO);

  return (
    <div>
      {erro && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{erro}</div>}

      {/* A partir de quando vale */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">A partir de quando esta regra vale</div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 12 }}>
          Antes desse mês, a nota continua calculada como era antes — sábado contando
          para todos e sem feriado nenhum. É o que impede que um mês já fechado e pago
          mude de número agora.
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Mês inicial</label>
            <input
              type="month"
              className="form-input"
              style={{ maxWidth: 200 }}
              value={mesCorte}
              onChange={(e) => setMesCorte(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary btn-sm"
            disabled={ocupado === 'corte'}
            onClick={() => executar('corte', () => definirExpedienteValeDe(mesCorte))}
          >
            {ocupado === 'corte' ? 'Salvando…' : 'Salvar'}
          </button>
          {valeDe && (
            <button
              className="btn btn-secondary btn-sm"
              disabled={ocupado === 'corte'}
              onClick={() => executar('corte', () => definirExpedienteValeDe(null))}
            >
              Valer para todos os meses
            </button>
          )}
        </div>
        <p style={{ fontSize: '0.8125rem', marginTop: 10 }}>
          {valeDe
            ? <>Hoje vale a partir de <strong>{NOMES_MES[Number(valeDe.slice(5, 7)) - 1]} de {valeDe.slice(0, 4)}</strong>.</>
            : <>Hoje vale para <strong>todos os meses</strong>, inclusive os já fechados.</>}
        </p>
      </div>

      {/* Dias sem expediente */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span>Dias em que a agência não abriu</span>
          <button
            className="btn btn-secondary btn-sm"
            disabled={ocupado === 'semear'}
            onClick={() => executar('semear', async () => {
              const r = await semearFeriadosNacionais([2026, 2027]);
              alert(`${r.criados} feriado(s) nacional(is) adicionado(s).`);
            })}
          >
            {ocupado === 'semear' ? 'Carregando…' : 'Carregar feriados nacionais (2026 e 2027)'}
          </button>
        </div>

        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 14 }}>
          Esses dias saem da conta de <strong>todos</strong> os setores. Feriado municipal
          não entra sozinho — só acrescente quando a agência de fato tiver fechado.
        </p>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Data</label>
            <input type="date" className="form-input" style={{ maxWidth: 180 }} value={novaData} onChange={(e) => setNovaData(e.target.value)} />
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
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Nenhum dia cadastrado. Use o botão acima para carregar os feriados nacionais.
          </p>
        ) : (
          <>
            {futuros.length > 0 && (
              <>
                <div className="section-label" style={{ marginBottom: 8 }}>Ainda vão acontecer</div>
                {futuros.map((d) => <Linha key={d.id} dia={d} ocupado={ocupado} executar={executar} />)}
              </>
            )}
            {passados.length > 0 && (
              <>
                <div className="section-label" style={{ margin: '16px 0 8px' }}>Já passaram</div>
                {passados.map((d) => <Linha key={d.id} dia={d} ocupado={ocupado} executar={executar} apagado />)}
              </>
            )}
          </>
        )}
      </div>

      {/* Resumo dos setores */}
      <div className="card">
        <div className="card-title">Dias de expediente de cada setor</div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 12 }}>
          Isso é configurado dentro de cada setor, em <strong>Editar setor</strong>.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {setores.map((s, i) => (
            <div
              key={s.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 12, flexWrap: 'wrap', padding: '10px 0',
                borderTop: i === 0 ? 'none' : '1px solid var(--border)',
              }}
            >
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{s.nome}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="badge badge-info">{formatarDiasExpediente(s.diasExpediente)}</span>
                <Link href={`/setores/${s.id}/editar`} className="btn btn-secondary btn-sm">Editar</Link>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Linha({
  dia, ocupado, executar, apagado,
}: {
  dia: Dia;
  ocupado: string | null;
  executar: (chave: string, fn: () => Promise<unknown>) => Promise<void>;
  apagado?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, flexWrap: 'wrap', padding: '8px 0', opacity: apagado ? 0.6 : 1,
    }}>
      <span style={{ fontSize: '0.875rem' }}>
        <strong>{dataBR(dia.data)}</strong> · {dia.descricao}
      </span>
      <button
        className="btn btn-danger btn-sm"
        disabled={ocupado === dia.id}
        onClick={() => executar(dia.id, () => removerDiaSemExpediente(dia.id))}
      >
        Remover
      </button>
    </div>
  );
}
