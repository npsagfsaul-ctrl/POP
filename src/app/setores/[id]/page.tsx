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
          <h1>Setor: {setor.nome}</h1>
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
