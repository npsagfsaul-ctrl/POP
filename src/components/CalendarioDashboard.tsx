'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { salvarComentarioAdmin, marcarAlertaComoLido } from '@/actions/checklist';

interface Pop {
  id: string;
  peso: number;
}

interface Registro {
  id: string;
  data: Date;
  respostas: Record<string, boolean>;
  comentarioAdmin?: string | null;
  alertaAdmin?: boolean;
}

interface CalendarioProps {
  setorId: string;
  pops: Pop[];
  registros: Registro[];
  mes: number;
  ano: number;
  adminMode?: boolean;
}

export default function CalendarioDashboard({ setorId, pops, registros, mes, ano, adminMode = false }: CalendarioProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDia, setSelectedDia] = useState<number | null>(null);
  const [comentarioTexto, setComentarioTexto] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const pesoTotal = pops.reduce((acc, pop) => acc + pop.peso, 0);

  const registrosPorDia = new Map<number, Registro>();
  registros.forEach(registro => {
    const dia = new Date(registro.data).getUTCDate();
    registrosPorDia.set(dia, registro);
  });

  const getConformidade = (registro: Registro) => {
    const respostas = registro.respostas;
    let pesoAtingido = 0;
    pops.forEach(pop => {
      if (respostas && respostas[pop.id] === true) pesoAtingido += pop.peso;
    });
    return pesoTotal > 0 ? (pesoAtingido / pesoTotal) * 100 : 0;
  };

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
  registrosPorDia.forEach((registro, dia) => {
    const dataObjeto = new Date(ano, mes - 1, dia);
    if (dataObjeto.getDay() !== 0) {
      soma += getConformidade(registro);
      diasContados++;
    }
  });
  const media = diasContados > 0 ? Math.round(soma / diasContados) : 0;

  const handleOpenModal = (e: React.MouseEvent, dia: number) => {
    e.preventDefault();
    e.stopPropagation();
    const registro = registrosPorDia.get(dia);
    setComentarioTexto(registro?.comentarioAdmin || '');
    setSelectedDia(dia);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedDia(null);
    setComentarioTexto('');
  };

  const handleSalvarComentario = async () => {
    if (!selectedDia) return;
    setIsSaving(true);
    const dataString = `${ano}-${String(mes).padStart(2, '0')}-${String(selectedDia).padStart(2, '0')}`;
    await salvarComentarioAdmin(setorId, dataString, comentarioTexto);
    setIsSaving(false);
    handleCloseModal();
  };

  const handleMarcarComoLido = async () => {
    if (!selectedDia) return;
    const registro = registrosPorDia.get(selectedDia);
    if (registro) {
      setIsSaving(true);
      await marcarAlertaComoLido(registro.id, setorId);
      setIsSaving(false);
      handleCloseModal();
    }
  };

  return (
    <div className="card" style={{ marginTop: 24, position: 'relative' }}>
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
          const registro = registrosPorDia.get(dia);
          const conformidade = registro ? getConformidade(registro) : undefined;
          const dataString = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
          const dataObjeto = new Date(`${dataString}T00:00:00`);
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);

          const isFuturo = dataObjeto > hoje;
          const isDomingo = dataObjeto.getDay() === 0;
          const registrado = conformidade !== undefined;
          const temAlerta = !!registro?.alertaAdmin;
          const temComentarioAdmin = !!registro?.comentarioAdmin;

          let cls = '';
          let statusText = '';

          if (isDomingo) {
            cls = 'sunday';
            statusText = 'OFF';
          } else if (isFuturo) {
            cls = 'future';
            statusText = '';
          } else if (registrado) {
            cls = conformidade! === 100 ? 'success' : conformidade! >= 80 ? 'warning' : 'danger';
            statusText = `${Math.round(conformidade!)}%`;
          } else {
            cls = 'danger';
            statusText = '—';
          }

          const inner = (
            <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span className="cal-num">{dia}</span>
              {statusText && <span className="cal-pct">{statusText}</span>}
              
              {/* Alerta badge for sector representative */}
              {!adminMode && temAlerta && (
                <div 
                  onClick={(e) => handleOpenModal(e, dia)}
                  style={{
                    position: 'absolute', top: 4, right: 4, width: 12, height: 12, 
                    backgroundColor: 'var(--danger)', borderRadius: '50%', cursor: 'pointer',
                    boxShadow: '0 0 0 2px white'
                  }}
                  title="Alerta do Administrador"
                />
              )}

              {/* Admin Comment Button */}
              {adminMode && !isDomingo && !isFuturo && (
                <button
                  onClick={(e) => handleOpenModal(e, dia)}
                  style={{
                    position: 'absolute', top: 4, right: 4, background: 'none', border: 'none', cursor: 'pointer',
                    color: temComentarioAdmin ? 'var(--primary)' : 'var(--text-muted)',
                    padding: 2, display: 'flex'
                  }}
                  title={temComentarioAdmin ? "Editar Comentário" : "Adicionar Comentário"}
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </button>
              )}
            </div>
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
              style={{ position: 'relative' }}
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
            { cls: 'success', label: '100% Conforme', color: 'var(--success)' },
            { cls: 'warning', label: 'Atenção (80% a 99%)', color: 'var(--warning)' },
            { cls: 'danger',  label: 'Abaixo da meta (<80%)',  color: 'var(--danger)' },
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
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: media === 100 ? 'var(--success)' : media >= 80 ? 'var(--warning)' : 'var(--danger)', lineHeight: 1 }}>
                {media}%
              </div>
            </div>
            <div style={{ width: 1, height: 36, background: 'var(--border)' }} />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: 140 }}>
              {media === 100
                ? '✓ Padrão de excelência'
                : media >= 80
                ? '⚠ Atenção às ocorrências'
                : '❌ Abaixo da meta'}
            </div>
          </div>
        )}
      </div>

      {/* Modal for Comments/Alerts */}
      {modalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 400, padding: 24 }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 16 }}>
              {adminMode ? `Comentário - ${selectedDia}/${mes}/${ano}` : `Alerta do Administrador`}
            </h3>
            
            {adminMode ? (
              <>
                <textarea
                  className="form-input"
                  style={{ minHeight: 100, marginBottom: 16 }}
                  placeholder="Digite o comentário/alerta para este dia..."
                  value={comentarioTexto}
                  onChange={(e) => setComentarioTexto(e.target.value)}
                />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={handleCloseModal} disabled={isSaving}>Cancelar</button>
                  <button className="btn btn-primary" onClick={handleSalvarComentario} disabled={isSaving}>
                    {isSaving ? 'Salvando...' : 'Salvar Alerta'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{comentarioTexto || 'Sem mensagem.'}</p>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={handleCloseModal} disabled={isSaving}>Fechar</button>
                  <button className="btn btn-primary" onClick={handleMarcarComoLido} disabled={isSaving}>
                    {isSaving ? 'Marcando...' : 'Marcar como lido'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
