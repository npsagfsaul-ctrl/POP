import { prisma } from '@/lib/prisma';
import { getPopsBySetor } from '@/actions/pops';
import { getRegistrosMensais } from '@/actions/checklist';
import CalendarioDashboard from '@/components/CalendarioDashboard';
import PasswordPrompt from '@/components/PasswordPrompt';
import DeletePopButton from '@/components/DeletePopButton';
import DeleteSetorButton from '@/components/DeleteSetorButton';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function VisualizarSetor({ 
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

  // Verificar proteção por senha
  if (setor.senha) {
    const cookieStore = await cookies();
    const isAuthed = cookieStore.get(`auth_setor_${setor.id}`);
    
    if (!isAuthed) {
      return <PasswordPrompt setorId={setor.id} setorNome={setor.nome} />;
    }
  }

  const pops = await getPopsBySetor(resolvedParams.id);

  const hoje = new Date();
  const mesAtual = resolvedSearchParams.mes ? parseInt(resolvedSearchParams.mes) : hoje.getMonth() + 1;
  const anoAtual = resolvedSearchParams.ano ? parseInt(resolvedSearchParams.ano) : hoje.getFullYear();
  
  const registros = await getRegistrosMensais(resolvedParams.id, mesAtual, anoAtual);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <Link href="/" className="text-muted text-sm hover:underline mb-2 inline-block">
            &larr; Voltar para Setores
          </Link>
          <h1 className="text-3xl font-bold">Setor: {setor.nome}</h1>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Link href={`/setores/${setor.id}/checklist`} className="btn btn-secondary bg-emerald-500 text-white hover:bg-emerald-600 border-none btn-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Checklist Diário
          </Link>
          <Link href={`/setores/${setor.id}/relatorio?mes=${mesAtual}&ano=${anoAtual}`} className="btn btn-secondary btn-sm">
            Relatório
          </Link>
          <Link href={`/setores/${setor.id}/editar`} className="btn btn-secondary btn-sm" title="Editar Setor">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Link>
          <DeleteSetorButton setorId={setor.id} setorNome={setor.nome} />
          <Link href="/pops/novo" className="btn btn-primary btn-sm ml-2">
            Novo POP
          </Link>
        </div>
      </div>

      {/* Resumo Rápido */}
      {pops.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="card bg-white p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Total de POPs</p>
              <p className="text-xl font-bold">{pops.length}</p>
            </div>
          </div>
          
          <div className="card bg-white p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Realizados (Mês)</p>
              <p className="text-xl font-bold">{registros.length}</p>
            </div>
          </div>

          <div className="card bg-white p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Meta</p>
              <p className="text-xl font-bold">80%</p>
            </div>
          </div>

          <div className="card bg-primary text-white p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-white/70">Desempenho</p>
              <p className="text-xl font-bold">
                {(() => {
                  let soma = 0;
                  let diasContados = 0;
                  const pesoTotal = pops.reduce((acc, p) => acc + p.peso, 0);
                  
                  registros.forEach(reg => {
                    if (new Date(reg.data).getUTCDay() !== 0) { // Excluir domingos
                      let pesoAtingido = 0;
                      const respostas = reg.respostas as Record<string, boolean>;
                      pops.forEach(pop => {
                        if (respostas && respostas[pop.id] === true) pesoAtingido += pop.peso;
                      });
                      soma += (pesoAtingido / pesoTotal) * 100;
                      diasContados++;
                    }
                  });
                  return diasContados > 0 ? Math.round(soma / diasContados) : 0;
                })()}%
              </p>
            </div>
          </div>
        </div>
      )}


      {pops.length === 0 ? (
        <div className="card text-center py-12">
          <h2 className="text-muted mb-4">Nenhum POP cadastrado neste setor ainda.</h2>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <CalendarioDashboard 
            setorId={resolvedParams.id} 
            pops={pops} 
            registros={registros.map(r => ({
              ...r,
              respostas: r.respostas as Record<string, boolean>
            }))} 
            mes={mesAtual} 
            ano={anoAtual} 
          />

          <div>
            <h2 className="text-xl font-bold mb-4">POPs Cadastrados ({pops.length})</h2>
            <div className="grid grid-cols-1">
              {pops.map((pop) => (
            <div key={pop.id} className="card">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl text-primary">{pop.titulo}</h2>
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    Peso: {pop.peso}
                  </span>
                  <div className="flex items-center gap-3 ml-4 border-l pl-4">
                    <Link 
                      href={`/pops/${pop.id}/editar`}
                      className="text-primary hover:text-primary-dark font-medium text-xs flex items-center gap-1 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </Link>
                    <DeletePopButton popId={pop.id} setorId={resolvedParams.id} popTitulo={pop.titulo} />
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Orientação da Forma de Avaliação</h3>
                <div className="bg-zinc-50 p-4 rounded border border-border whitespace-pre-wrap">
                  {pop.orientacaoAvaliacao}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Instrução de Trabalho</h3>
                <div className="bg-zinc-50 p-4 rounded border border-border whitespace-pre-wrap">
                  {pop.instrucaoTrabalho}
                </div>
              </div>
              
              <div className="text-xs text-muted mt-6 pt-4 border-t border-border">
                Criado em: {new Date(pop.createdAt).toLocaleDateString('pt-BR')}
              </div>
            </div>
          ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
