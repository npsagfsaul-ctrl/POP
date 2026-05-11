import React from 'react';
import Link from 'next/link';

interface Pop {
  id: string;
  peso: number;
}

interface Registro {
  data: Date;
  respostas: Record<string, boolean>; // JSON estruturado
}

interface CalendarioProps {
  setorId: string;
  pops: Pop[];
  registros: Registro[];
  mes: number;
  ano: number;
}

export default function CalendarioDashboard({ setorId, pops, registros, mes, ano }: CalendarioProps) {
  // Calcular peso total possível
  const pesoTotal = pops.reduce((acc, pop) => acc + pop.peso, 0);

  // Mapear registros por dia
  const registrosPorDia = new Map<number, number>(); // dia -> % de conformidade (0-100)
  
  registros.forEach(registro => {
    const dia = new Date(registro.data).getUTCDate();
    const respostas = registro.respostas;
    
    let pesoAtingido = 0;
    pops.forEach(pop => {
      if (respostas && respostas[pop.id] === true) {
        pesoAtingido += pop.peso;
      }
    });

    const conformidade = pesoTotal > 0 ? (pesoAtingido / pesoTotal) * 100 : 0;
    registrosPorDia.set(dia, conformidade);
  });

  // Gerar dias do mês
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay(); // 0 = Domingo
  
  const dias = Array.from({ length: diasNoMes }, (_, i) => i + 1);
  const espacosVazios = Array.from({ length: primeiroDiaSemana }, (_, i) => i);

  const diasDaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Navegação
  const prevMes = mes === 1 ? 12 : mes - 1;
  const prevAno = mes === 1 ? ano - 1 : ano;
  const nextMes = mes === 12 ? 1 : mes + 1;
  const nextAno = mes === 12 ? ano + 1 : ano;

  const nomeMeses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <div className="card bg-slate-800/40 border-slate-700/50 mt-8 overflow-visible">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center bg-slate-900/50 rounded-xl p-1 border border-white/5">
            <Link 
              href={`/setores/${setorId}?mes=${prevMes}&ano=${prevAno}`}
              className="p-2 hover:bg-slate-800 hover:text-white rounded-lg transition-all text-slate-500"
              title="Mês Anterior"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </Link>
            <div className="px-3 text-xs font-bold text-slate-400 uppercase tracking-tighter">Hoje</div>
            <Link 
              href={`/setores/${setorId}?mes=${nextMes}&ano=${nextAno}`}
              className="p-2 hover:bg-slate-800 hover:text-white rounded-lg transition-all text-slate-500"
              title="Próximo Mês"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
          <div>
            <h2 className="text-3xl font-black text-white leading-tight tracking-tight">Registro de Atividades</h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">{nomeMeses[mes - 1]} {ano}</p>
          </div>
        </div>
        <div className="bg-primary/10 border border-primary/20 px-5 py-2 rounded-2xl text-primary font-black text-sm flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
          META: 80%
        </div>
      </div>

      <div className="grid grid-cols-7 gap-4 mb-4 text-center">
        {diasDaSemana.map(d => (
          <div key={d} className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-4">
        {espacosVazios.map(i => (
          <div key={`empty-${i}`} className="aspect-square rounded-2xl bg-slate-900/20 border border-white/5 opacity-30"></div>
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
          
          let cardStyle = 'bg-slate-900/30 border-white/5 text-slate-600 hover:border-primary/50 hover:bg-slate-900/50';
          let statusText = '-';
          let indicatorColor = 'bg-slate-700';
          let textColor = 'text-slate-400';

          if (isDomingo) {
            cardStyle = 'bg-slate-900/10 border-transparent text-slate-700 opacity-40 cursor-default';
            statusText = 'OFF';
            indicatorColor = 'transparent';
          } else if (registrado) {
            if (conformidade! >= 80) {
              cardStyle = 'bg-teal-500/10 border-teal-500/20 text-teal-400 hover:shadow-[0_0_20px_rgba(45,212,191,0.1)]';
              indicatorColor = 'bg-teal-400';
              textColor = 'text-teal-400';
              statusText = `${Math.round(conformidade!)}%`;
            } else {
              cardStyle = 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:shadow-[0_0_20px_rgba(251,191,36,0.1)]';
              indicatorColor = 'bg-amber-400';
              textColor = 'text-amber-400';
              statusText = `${Math.round(conformidade!)}%`;
            }
          } else if (!isFuturo) {
            cardStyle = 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:shadow-[0_0_20px_rgba(251,113,133,0.1)]';
            indicatorColor = 'bg-rose-400';
            textColor = 'text-rose-400';
            statusText = 'LOST';
          } else {
            cardStyle = 'bg-slate-900/20 border-white/5 text-slate-600 opacity-50 cursor-not-allowed';
            statusText = 'PEND';
            indicatorColor = 'transparent';
          }

          const content = (
            <>
              <span className={`text-lg font-black transition-transform group-hover:scale-110 ${textColor}`}>
                {dia}
              </span>
              <div className="flex flex-col items-center mt-1">
                <span className="text-[7px] uppercase font-black tracking-widest opacity-60">
                  {statusText}
                </span>
                {indicatorColor !== 'transparent' && (
                  <div className={`w-1 h-1 rounded-full mt-1.5 shadow-sm ${indicatorColor}`} />
                )}
              </div>
            </>
          );

          if (isFuturo || isDomingo) {
            return (
              <div key={dia} className={`relative aspect-square flex flex-col items-center justify-center p-2 rounded-2xl border transition-all ${cardStyle}`}>
                {content}
              </div>
            );
          }

          return (
            <Link
              key={dia}
              href={`/setores/${setorId}/checklist?data=${dataString}`}
              className={`relative aspect-square flex flex-col items-center justify-center p-2 rounded-2xl border transition-all duration-300 group shadow-sm ${cardStyle}`}
              title={registrado ? 'Editar Registro' : 'Preencher Checklist'}
            >
              {content}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-8 mt-12 p-8 bg-slate-900/40 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] justify-center border border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-teal-500 shadow-[0_0_10px_rgba(45,212,191,0.5)]"></div> 
          <span className="text-slate-400">Excelente (≥ 80%)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(251,191,36,0.5)]"></div> 
          <span className="text-slate-400">Abaixo Meta</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(251,113,133,0.5)]"></div> 
          <span className="text-slate-400">Não Realizado</span>
        </div>
      </div>

      {(() => {
        let soma = 0;
        let diasContados = 0;
        
        registrosPorDia.forEach((valor, dia) => {
          const dataObjeto = new Date(ano, mes - 1, dia);
          if (dataObjeto.getDay() !== 0) {
            soma += valor;
            diasContados++;
          }
        });

        const media = diasContados > 0 ? soma / diasContados : 0;
        
        if (diasContados > 0) {
          return (
            <div className="mt-10 p-1 bg-gradient-to-r from-transparent via-slate-700/30 to-transparent rounded-full overflow-hidden">
               <div className="bg-slate-900/80 backdrop-blur-xl px-10 py-6 rounded-full text-center border border-white/5">
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Média Mensal Seg-Sáb</p>
                  <div className="flex items-center justify-center gap-4">
                    <span className={`text-4xl font-black ${media >= 80 ? 'text-teal-400' : 'text-amber-400'}`}>{Math.round(media)}%</span>
                    <div className="h-8 w-px bg-slate-800"></div>
                    <span className="text-slate-500 text-[10px] font-bold max-w-[200px] text-left leading-tight">
                      {media >= 80 ? 'DESEMPENHO DENTRO DO PADRÃO DE EXCELÊNCIA' : 'NECESSÁRIO AJUSTE DE PROCESSOS PARA ATINGIR A META'}
                    </span>
                  </div>
               </div>
            </div>
          );
        }
        
        return null;
      })()}
    </div>
  );
}
