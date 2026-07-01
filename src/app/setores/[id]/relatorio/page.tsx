import { prisma } from '@/lib/prisma';
import { getPopsBySetor } from '@/actions/pops';
import { getRegistrosMensais } from '@/actions/checklist';
import { calcularConformidade } from '@/lib/conformidade';
import PrintButton from '@/components/PrintButton';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function RelatorioMensal({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ id: string }>,
  searchParams: Promise<{ mes?: string, ano?: string }>
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const setor = await prisma.setor.findUnique({
    where: { id: resolvedParams.id },
  });

  if (!setor) {
    notFound();
  }

  const hoje = new Date();
  const mes = resolvedSearchParams.mes ? parseInt(resolvedSearchParams.mes) : hoje.getMonth() + 1;
  const ano = resolvedSearchParams.ano ? parseInt(resolvedSearchParams.ano) : hoje.getFullYear();
  
  const pops = await getPopsBySetor(resolvedParams.id);
  const registros = await getRegistrosMensais(resolvedParams.id, mes, ano);

  const nomeMeses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Filtrar registros para excluir domingos
  const registrosUteis = registros.filter(reg => {
    const data = new Date(reg.data);
    return data.getUTCDay() !== 0; // 0 = Domingo
  });

  // Agregar estatísticas por POP (apenas dias úteis)
  const statsPorPop = pops.map(pop => {
    let totalRealizado = 0;
    let totalConforme = 0;

    registrosUteis.forEach(reg => {
      const respostas = reg.respostas as Record<string, boolean>;
      if (respostas && pop.id in respostas) {
        totalRealizado++;
        if (respostas[pop.id] === true) {
          totalConforme++;
        }
      }
    });

    const percentual = totalRealizado > 0 ? (totalConforme / totalRealizado) * 100 : 0;
    
    return {
      ...pop,
      totalRealizado,
      totalConforme,
      percentual
    };
  });

  // Média de Conformidade Global — mesma regra do dashboard:
  // dias úteis (Seg–Sáb) até hoje, a partir da criação do setor;
  // dia sem checklist conta como 0%.
  const {
    media: mediaGlobal,
    bateuMeta,
    perdaPorDiaNaoPreenchido,
    perdaPorPendencia,
    dias: diasLedger,
  } = calcularConformidade(pops, registros, mes, ano, hoje, setor.createdAt);

  // Ordenar por menor percentual para destacar problemas
  const criticalPops = [...statsPorPop].sort((a, b) => a.percentual - b.percentual);

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Link href={`/setores/${setor.id}?mes=${mes}&ano=${ano}`} className="text-muted text-sm hover:underline mb-2 inline-block">
            &larr; Voltar para Dashboard
          </Link>
          <h1 className="text-3xl font-bold">Relatório Analítico: {setor.nome}</h1>
          <p className="text-muted font-medium">{nomeMeses[mes - 1]} de {ano} <span className="mx-2">•</span> <span className="text-primary">Filtro: Seg-Sáb</span></p>
        </div>
        <PrintButton />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="card bg-slate-50 border-slate-100 flex flex-col justify-between">
          <div>
            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Checklists Realizados</h3>
            <p className="text-4xl font-black text-slate-800">{registrosUteis.length}</p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-tight">Período Selecionado</p>
            <p className="text-slate-600 text-xs font-medium">Excluindo Domingos</p>
          </div>
        </div>

        <div className={`card flex flex-col justify-between ${mediaGlobal >= 80 ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
          <div>
            <h3 className={`${mediaGlobal >= 80 ? 'text-emerald-800' : 'text-amber-800'} text-xs font-bold uppercase tracking-wider mb-1 text-center md:text-left`}>Média de Conformidade</h3>
            <div className="flex items-center gap-3 justify-center md:justify-start">
              <p className={`text-5xl font-black ${mediaGlobal >= 80 ? 'text-emerald-900' : 'text-amber-900'}`}>{Math.round(mediaGlobal)}%</p>
              <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${mediaGlobal >= 80 ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'}`}>
                {mediaGlobal >= 80 ? 'Meta Atingida' : 'Abaixo da Meta'}
              </div>
            </div>
          </div>
          <div className="mt-4">
             <div className="w-full h-1.5 bg-white/50 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${mediaGlobal >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                  style={{ width: `${Math.min(100, mediaGlobal)}%` }}
                ></div>
             </div>
             <p className={`text-[10px] font-bold mt-1 ${mediaGlobal >= 80 ? 'text-emerald-700' : 'text-amber-700'}`}>META: 80%</p>
          </div>
        </div>

        <div className="card bg-rose-50 border-rose-100 flex flex-col justify-between">
          <div>
            <h3 className="text-rose-800 text-xs font-bold uppercase tracking-wider mb-1">Item Mais Crítico</h3>
            <p className="text-xl font-bold text-rose-900 leading-tight mb-1">{criticalPops[0]?.titulo || '-'}</p>
            <p className="text-3xl font-black text-rose-900">{criticalPops.length > 0 ? Math.round(criticalPops[0].percentual) : 0}%</p>
          </div>
          <div className="mt-4 pt-4 border-t border-rose-200">
            <p className="text-rose-700 text-xs font-medium">Requer atenção imediata</p>
          </div>
        </div>
      </div>

      <div className="mb-10">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Detalhamento por Procedimento
        </h2>
        <div className="card overflow-hidden p-0 border-none shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="px-6 py-4 font-bold uppercase text-[11px] tracking-widest">Procedimento (POP)</th>
                  <th className="px-6 py-4 font-bold uppercase text-[11px] tracking-widest text-center">Peso</th>
                  <th className="px-6 py-4 font-bold uppercase text-[11px] tracking-widest text-center">Realizados</th>
                  <th className="px-6 py-4 font-bold uppercase text-[11px] tracking-widest text-center">Conformes</th>
                  <th className="px-6 py-4 font-bold uppercase text-[11px] tracking-widest text-right">Aproveitamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {statsPorPop.map(pop => (
                  <tr key={pop.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-5">
                      <div className="font-bold text-main">{pop.titulo}</div>
                      <div className="text-[10px] text-muted uppercase font-bold tracking-tighter mt-0.5">ID: {pop.id.slice(-8)}</div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold border border-slate-200">{pop.peso}</span>
                    </td>
                    <td className="px-6 py-5 text-center text-slate-600 font-medium">{pop.totalRealizado}</td>
                    <td className="px-6 py-5 text-center text-emerald-600 font-bold">{pop.totalConforme}</td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-4">
                        <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                          <div 
                            className={`h-full transition-all duration-500 ${pop.percentual >= 80 ? 'bg-emerald-500' : pop.percentual >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                            style={{ width: `${pop.percentual}%` }}
                          ></div>
                        </div>
                        <span className={`font-black text-sm min-w-[40px] ${pop.percentual >= 80 ? 'text-emerald-600' : pop.percentual >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                          {Math.round(pop.percentual)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mb-10">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Fechamento do Mês
        </h2>

        <div className={`card mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${bateuMeta ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
          <span className={`px-3 py-1.5 rounded-full text-sm font-bold uppercase w-fit ${bateuMeta ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'}`}>
            {bateuMeta ? 'Meta 80%: BATEU ✅' : 'Meta 80%: NÃO BATEU ❌'}
          </span>
          <p className="text-sm text-slate-600">
            {perdaPorDiaNaoPreenchido > 0 || perdaPorPendencia > 0 ? (
              <>Perda no mês: <strong>{perdaPorDiaNaoPreenchido}pp</strong> por dias não preenchidos e <strong>{perdaPorPendencia}pp</strong> por pendências marcadas.</>
            ) : (
              <>Nenhuma perda no mês — parabéns!</>
            )}
          </p>
        </div>

        <div className="card overflow-hidden p-0 border-none shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="px-6 py-4 font-bold uppercase text-[11px] tracking-widest">Dia</th>
                  <th className="px-6 py-4 font-bold uppercase text-[11px] tracking-widest text-center">Preenchido?</th>
                  <th className="px-6 py-4 font-bold uppercase text-[11px] tracking-widest text-center">% do dia</th>
                  <th className="px-6 py-4 font-bold uppercase text-[11px] tracking-widest">Pendências</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {diasLedger.map((d) => (
                  <tr key={d.dia} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3 font-medium text-main">{d.dia}/{mes}</td>
                    <td className="px-6 py-3 text-center">{d.preenchido ? '✅' : '❌'}</td>
                    <td className={`px-6 py-3 text-center font-bold ${d.conformidadeDia === 100 ? 'text-emerald-600' : d.conformidadeDia >= 80 ? 'text-amber-600' : 'text-rose-600'}`}>
                      {d.conformidadeDia}%
                    </td>
                    <td className="px-6 py-3 text-sm">
                      {!d.preenchido ? (
                        <span className="text-rose-600 font-medium">Checklist não preenchido</span>
                      ) : d.pendencias.length === 0 ? (
                        <span className="text-emerald-600">—</span>
                      ) : (
                        d.pendencias.map((p) => `${p.titulo} (peso ${p.peso})`).join(', ')
                      )}
                    </td>
                  </tr>
                ))}
                {diasLedger.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-6 text-center text-muted">Nenhum dia útil considerado neste período.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Este extrato reflete os POPs atualmente cadastrados; POPs excluídos não aparecem no histórico.
        </p>
      </div>

      <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>
        
        <div className="relative z-10">
          <h3 className="text-xl font-bold mb-4">Considerações Finais</h3>
          <p className="text-slate-300 leading-relaxed mb-6">
            Este relatório consolida o desempenho operacional do setor <strong className="text-white">{setor.nome}</strong> no mês de <strong className="text-white">{nomeMeses[mes - 1]}</strong>. 
            Os cálculos consideram apenas os dias úteis (Segunda a Sábado), alinhando-se à jornada de trabalho padrão.
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10">
              <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">Média do Setor</p>
              <p className="text-2xl font-black">{Math.round(mediaGlobal)}%</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10">
              <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">Total de POPs</p>
              <p className="text-2xl font-black">{pops.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10">
              <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">Status</p>
              <p className={`text-2xl font-black ${mediaGlobal >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {mediaGlobal >= 80 ? 'EXCELENTE' : 'EM EVOLUÇÃO'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
