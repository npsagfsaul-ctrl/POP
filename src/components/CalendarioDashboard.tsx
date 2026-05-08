import React from 'react';

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
    const respostas = typeof registro.respostas === 'string' 
      ? JSON.parse(registro.respostas) 
      : registro.respostas;
    
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

  return (
    <div className="card mt-8 overflow-visible">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-main">Desempenho Mensal</h2>
          <p className="text-muted">Acompanhamento de conformidade — {mes.toString().padStart(2, '0')}/{ano}</p>
        </div>
        <div className="bg-primary-light px-4 py-2 rounded-xl text-primary font-bold flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
          Meta: 80%
        </div>
      </div>

      <div className="grid grid-cols-7 gap-3 mb-4 text-center">
        {diasDaSemana.map(d => (
          <div key={d} className="text-xs font-bold text-slate-400 uppercase tracking-widest">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-3">
        {espacosVazios.map(i => (
          <div key={`empty-${i}`} className="aspect-square rounded-2xl bg-slate-50/50 border border-dashed border-slate-200"></div>
        ))}

        {dias.map(dia => {
          const conformidade = registrosPorDia.get(dia);
          const dataString = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
          const isHoje = new Date().toISOString().split('T')[0] === dataString;
          
          let bgColor = 'bg-white text-slate-400 border-slate-200'; 
          let statusText = 'Pendente';
          let indicatorColor = 'bg-slate-300';
          
          if (conformidade !== undefined) {
            if (conformidade >= 80) {
              bgColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';
              statusText = `${Math.round(conformidade)}%`;
              indicatorColor = 'bg-emerald-500';
            } else {
              bgColor = 'bg-amber-50 text-amber-700 border-amber-100';
              statusText = `${Math.round(conformidade)}%`;
              indicatorColor = 'bg-amber-500';
            }
          } else if (new Date(`${dataString}T00:00:00`) > new Date()) {
             // Dias futuros
             bgColor = 'bg-slate-50/30 text-slate-300 border-slate-100 opacity-60';
             statusText = '-';
             indicatorColor = 'transparent';
          } else {
            // Passado sem registro
            bgColor = 'bg-rose-50 text-rose-700 border-rose-100';
            statusText = 'Não realizado';
            indicatorColor = 'bg-rose-500';
          }

          return (
            <div 
              key={dia} 
              className={`relative aspect-square flex flex-col items-center justify-center rounded-2xl border transition-all duration-300 hover:scale-105 group ${bgColor} ${isHoje ? 'ring-2 ring-primary ring-offset-2' : ''}`}
              title={statusText}
            >
              <span className={`text-xl font-black ${isHoje ? 'text-primary' : ''}`}>{dia}</span>
              <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter opacity-80">{statusText}</span>
              {indicatorColor !== 'transparent' && (
                <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${indicatorColor}`}></div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-6 mt-10 p-6 bg-slate-50 rounded-2xl text-sm text-slate-600 justify-center border border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> 
          <span className="font-medium text-slate-700">Meta Atingida (≥ 80%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div> 
          <span className="font-medium text-slate-700">Abaixo da Meta (&lt; 80%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div> 
          <span className="font-medium text-slate-700">Não Realizado</span>
        </div>
      </div>

      {(() => {
        let soma = 0;
        registrosPorDia.forEach(v => soma += v);
        const media = registrosPorDia.size > 0 ? soma / registrosPorDia.size : 0;
        
        if (registrosPorDia.size > 0 && media < 80) {
          return (
            <div className="mt-8 p-8 bg-gradient-to-br from-indigo-50 via-white to-sky-50 border border-indigo-100 rounded-2xl text-center shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
              <h3 className="text-xl font-bold text-indigo-900 mb-3">Quase lá! 💪</h3>
              <p className="text-indigo-800 leading-relaxed max-w-2xl mx-auto">
                A média atual de conformidade do setor é de <strong className="text-amber-600 text-lg">{Math.round(media)}%</strong>. 
                Mantenha o foco nos pequenos detalhes! A meta de 80% está ao seu alcance e a constância é o segredo para o sucesso da equipe.
              </p>
            </div>
          );
        }
        
        if (registrosPorDia.size > 0 && media >= 80) {
          return (
            <div className="mt-8 p-8 bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-emerald-100 rounded-2xl text-center shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
              <h3 className="text-xl font-bold text-emerald-900 mb-3">Desempenho Excelente! 🌟</h3>
              <p className="text-emerald-800 leading-relaxed max-w-2xl mx-auto">
                Parabéns à equipe! A média de conformidade está em <strong className="text-emerald-600 text-lg">{Math.round(media)}%</strong>. 
                Vocês estão superando as expectativas e garantindo a excelência operacional.
              </p>
            </div>
          );
        }
        
        return null;
      })()}
    </div>
  );
}
