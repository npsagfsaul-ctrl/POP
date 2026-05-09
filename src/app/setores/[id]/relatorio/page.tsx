import { prisma } from '@/lib/prisma';
import { getPopsBySetor } from '@/actions/pops';
import { getRegistrosMensais } from '@/actions/checklist';
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

  // Agregar estatísticas por POP
  const statsPorPop = pops.map(pop => {
    let totalRealizado = 0;
    let totalConforme = 0;

    registros.forEach(reg => {
      const respostas = typeof reg.respostas === 'string' ? JSON.parse(reg.respostas) : reg.respostas;
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
          <p className="text-muted">{nomeMeses[mes - 1]} de {ano}</p>
        </div>
        <PrintButton />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="card bg-blue-50 border-blue-100">
          <h3 className="text-blue-800 text-sm font-bold uppercase mb-1">Checklists Realizados</h3>
          <p className="text-4xl font-black text-blue-900">{registros.length}</p>
          <p className="text-blue-700 text-xs mt-2">Neste período</p>
        </div>
        <div className="card bg-emerald-50 border-emerald-100">
          <h3 className="text-emerald-800 text-sm font-bold uppercase mb-1">Média de Conformidade</h3>
          <p className="text-4xl font-black text-emerald-900">
            {registros.length > 0 
              ? Math.round(statsPorPop.reduce((acc, p) => acc + p.percentual, 0) / statsPorPop.length) 
              : 0}%
          </p>
          <p className="text-emerald-700 text-xs mt-2">Meta: 80%</p>
        </div>
        <div className="card bg-amber-50 border-amber-100">
          <h3 className="text-amber-800 text-sm font-bold uppercase mb-1">Pior Desempenho</h3>
          <p className="text-4xl font-black text-amber-900">
            {criticalPops.length > 0 ? Math.round(criticalPops[0].percentual) : 0}%
          </p>
          <p className="text-amber-700 text-xs mt-2 truncate">POP: {criticalPops[0]?.titulo || '-'}</p>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-6">Detalhamento por Procedimento</h2>
      <div className="card overflow-hidden p-0">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 font-bold text-slate-700">Procedimento (POP)</th>
              <th className="px-6 py-4 font-bold text-slate-700 text-center">Peso</th>
              <th className="px-6 py-4 font-bold text-slate-700 text-center">Realizados</th>
              <th className="px-6 py-4 font-bold text-slate-700 text-center">Conformes</th>
              <th className="px-6 py-4 font-bold text-slate-700 text-right">Aproveitamento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {statsPorPop.map(pop => (
              <tr key={pop.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-main">{pop.titulo}</div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold">{pop.peso}</span>
                </td>
                <td className="px-6 py-4 text-center text-slate-600">{pop.totalRealizado}</td>
                <td className="px-6 py-4 text-center text-emerald-600 font-medium">{pop.totalConforme}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                      <div 
                        className={`h-full ${pop.percentual >= 80 ? 'bg-emerald-500' : pop.percentual >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                        style={{ width: `${pop.percentual}%` }}
                      ></div>
                    </div>
                    <span className={`font-bold ${pop.percentual >= 80 ? 'text-emerald-700' : 'text-rose-700'}`}>
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
  );
}
