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
    <div className="card mt-8 overflow-visible">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <Link 
              href={`/setores/${setorId}?mes=${prevMes}&ano=${prevAno}`}
              className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600"
              title="Mês Anterior"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </Link>
            <Link 
              href={`/setores/${setorId}?mes=${nextMes}&ano=${nextAno}`}
              className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600"
              title="Próximo Mês"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
          <div>
            <h2 className="text-3xl font-extrabold text-main leading-tight">Desempenho Mensal</h2>
            <p className="text-muted font-medium">{nomeMeses[mes - 1]} de {ano}</p>
          </div>
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
          const dataObjeto = new Date(`${dataString}T00:00:00`);
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);
          
          const isFuturo = dataObjeto > hoje;
          const registrado = conformidade !== undefined;
          
          let cardStyle = 'bg-white border-slate-200 text-slate-400 hover:border-primary hover:bg-slate-50';
          let statusText = 'Pendente';
          let indicatorColor = 'bg-slate-200';
          let textColor = 'text-slate-400';

          if (registrado) {
            if (conformidade! >= 80) {
              cardStyle = 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:shadow-md';
              indicatorColor = 'bg-emerald-500';
              textColor = 'text-emerald-700';
              statusText = `${Math.round(conformidade!)}%`;
            } else {
              cardStyle = 'bg-amber-50 border-amber-100 text-amber-700 hover:shadow-md';
              indicatorColor = 'bg-amber-500';
              textColor = 'text-amber-700';
              statusText = `${Math.round(conformidade!)}%`;
            }
          } else if (!isFuturo) {
            // Passado sem registro = VERMELHO
            cardStyle = 'bg-rose-50 border-rose-100 text-rose-700 hover:shadow-md';
            indicatorColor = 'bg-rose-500';
            textColor = 'text-rose-700';
            statusText = 'Não Realizado';
          } else {
            // Futuro
            cardStyle = 'bg-slate-50/50 border-slate-100 text-slate-300 opacity-60 cursor-not-allowed';
            statusText = '-';
            indicatorColor = 'transparent';
          }

          const content = (
            <>
              <span className={`text-base font-bold group-hover:scale-110 transition-transform ${textColor}`}>
                {dia}
              </span>
              <div className="flex flex-col items-center mt-1">
                <span className="text-[8px] uppercase font-bold tracking-tighter opacity-80">
                  {statusText}
                </span>
                {indicatorColor !== 'transparent' && (
                  <div className={`w-1.5 h-1.5 rounded-full mt-1 ${indicatorColor}`} />
                )}
              </div>
            </>
          );

          if (isFuturo) {
            return (
              <div key={dia} className={`relative aspect-square flex flex-col items-center justify-center p-2 rounded-2xl border ${cardStyle}`}>
                {content}
              </div>
            );
          }

          return (
            <Link
              key={dia}
              href={`/setores/${setorId}/checklist?data=${dataString}`}
              className={`relative aspect-square flex flex-col items-center justify-center p-2 rounded-2xl border transition-all duration-200 group ${cardStyle}`}
              title={registrado ? 'Editar Registro' : 'Preencher Checklist'}
            >
              {content}
            </Link>
          );
        })}

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
