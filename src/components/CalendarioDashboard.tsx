import React from 'react';
import Link from 'next/link';

interface Pop {
  id: string;
  peso: number;
}

interface Registro {
  data: Date;
  respostas: Record<string, boolean>;
}

interface CalendarioProps {
  setorId: string;
  pops: Pop[];
  registros: Registro[];
  mes: number;
  ano: number;
}

export default function CalendarioDashboard({ setorId, pops, registros, mes, ano }: CalendarioProps) {
  const pesoTotal = pops.reduce((acc, pop) => acc + pop.peso, 0);

  const registrosPorDia = new Map<number, number>();
  registros.forEach(registro => {
    const dia = new Date(registro.data).getUTCDate();
    const respostas = registro.respostas;
    let pesoAtingido = 0;
    pops.forEach(pop => {
      if (respostas && respostas[pop.id] === true) pesoAtingido += pop.peso;
    });
    const conformidade = pesoTotal > 0 ? (pesoAtingido / pesoTotal) * 100 : 0;
    registrosPorDia.set(dia, conformidade);
  });

  const diasNoMes = new Date(ano, mes, 0).getDate();
  const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay();
  const dias = Array.from({ length: diasNoMes }, (_, i) => i + 1);
  const espacosVazios = Array.from({ length: primeiroDiaSemana }, (_, i) => i);
  const diasDaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const prevMes = mes === 1 ? 12 : mes - 1;
  const prevAno = mes === 1 ? ano - 1 : ano;
  const nextMes = mes === 12 ? 1 : mes + 1;
  const nextAno = mes === 12 ? ano + 1 : ano;

  const nomeMeses = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
  ];

  // Calcular média mensal
  let soma = 0;
  let diasContados = 0;
  registrosPorDia.forEach((valor, dia) => {
    const dataObjeto = new Date(ano, mes - 1, dia);
    if (dataObjeto.getDay() !== 0) {
      soma += valor;
      diasContados++;
    }
  });
  const media = diasContados > 0 ? Math.round(soma / diasContados) : 0;

  return (
    <div className="card" style={{ marginTop: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 2 }}>
            Registro de Atividades
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            {nomeMeses[mes - 1]} de {ano}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Meta badge */}
          <span className="badge badge-primary" style={{ fontSize: '0.8125rem' }}>
            Meta: 80%
          </span>

          {/* Nav meses */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '4px' }}>
            <Link
              href={`/setores/${setorId}?mes=${prevMes}&ano=${prevAno}`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', transition: 'all 0.15s ease' }}
              title="Mês Anterior"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', padding: '0 8px' }}>
              {nomeMeses[mes - 1].slice(0, 3)}
            </span>
            <Link
              href={`/setores/${setorId}?mes=${nextMes}&ano=${nextAno}`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', transition: 'all 0.15s ease' }}
              title="Próximo Mês"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="calendar-grid" style={{ marginBottom: 8 }}>
        {diasDaSemana.map(d => (
          <div key={d} className="cal-header">{d}</div>
        ))}
      </div>

      <div className="calendar-grid">
        {espacosVazios.map(i => (
          <div key={`empty-${i}`} className="cal-day empty" />
        ))}

        {dias.map(dia => {
          const conformidade = registrosPorDia.get(dia);
          const dataString = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
          const dataObjeto = new Date(`${dataString}T00:00:00`);
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);

          const isFuturo = dataObjeto > hoje;
          const isDomingo = dataObjeto.getDay() === 0;
          const registrado = conformidade !== undefined;

          let cls = '';
          let statusText = '';

          if (isDomingo) {
            cls = 'sunday';
            statusText = 'OFF';
          } else if (isFuturo) {
            cls = 'future';
            statusText = '';
          } else if (registrado) {
            cls = conformidade! >= 80 ? 'success' : 'warning';
            statusText = `${Math.round(conformidade!)}%`;
          } else {
            cls = 'danger';
            statusText = '—';
          }

          const inner = (
            <>
              <span className="cal-num">{dia}</span>
              {statusText && <span className="cal-pct">{statusText}</span>}
            </>
          );

          if (isFuturo || isDomingo) {
            return (
              <div key={dia} className={`cal-day ${cls}`}>{inner}</div>
            );
          }

          return (
            <Link
              key={dia}
              href={`/setores/${setorId}/checklist?data=${dataString}`}
              className={`cal-day ${cls}`}
              title={registrado ? 'Editar Registro' : 'Preencher Checklist'}
            >
              {inner}
            </Link>
          );
        })}
      </div>

      {/* Legend + Media */}
      <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', gap: 20 }}>
          {[
            { cls: 'success', label: 'Excelente (≥80%)', color: 'var(--success)' },
            { cls: 'warning', label: 'Abaixo da meta', color: 'var(--warning)' },
            { cls: 'danger',  label: 'Não realizado',  color: 'var(--danger)' },
          ].map(item => (
            <div key={item.cls} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
              {item.label}
            </div>
          ))}
        </div>

        {diasContados > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '10px 20px'
          }}>
            <div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 2 }}>
                Média Mensal
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: media >= 80 ? 'var(--success)' : 'var(--warning)', lineHeight: 1 }}>
                {media}%
              </div>
            </div>
            <div style={{ width: 1, height: 36, background: 'var(--border)' }} />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: 140 }}>
              {media >= 80
                ? '✓ Dentro do padrão de excelência'
                : '⚠ Necessário ajuste de processos'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
