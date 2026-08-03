import { getSetorById } from '@/actions/setores';
import { getPopsBySetor } from '@/actions/pops';
import PasswordPrompt from '@/components/PasswordPrompt';
import Link from 'next/link';
import { cookies } from 'next/headers';
import ChecklistForm from '@/components/ChecklistForm';
import { getRegistroPorData } from '@/actions/checklist';
import { getAtendentesPorSetor } from '@/actions/atendentes';
import { hojeISOSaoPaulo } from '@/lib/data';

export default async function ChecklistDiario({ 
  params,
  searchParams
}: { 
  params: Promise<{ id: string }>,
  searchParams: Promise<{ data?: string }>
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const setor = await getSetorById(resolvedParams.id);
  const pops = await getPopsBySetor(resolvedParams.id);
  
  // Data de Brasília — com o UTC do servidor, depois das 21h daqui o
  // checklist abria já no dia seguinte.
  const hoje = hojeISOSaoPaulo();
  const dataSelecionada = resolvedSearchParams.data || hoje;

  if (!setor) {
    return <div className="text-center py-12">Setor não encontrado.</div>;
  }

  // Buscar registro existente para a data se houver
  const registroExistente = await getRegistroPorData(setor.id, dataSelecionada);
  const respostasIniciais = registroExistente ? (registroExistente.respostas as Record<string, boolean>) : {};
  const responsaveisIniciais = registroExistente ? (registroExistente.responsaveis as Record<string, string>) : {};
  const observacoesInicial = registroExistente ? (registroExistente.observacoes as string) : '';
  // Só os funcionários deste setor (mais os sem setor definido).
  const atendentes = await getAtendentesPorSetor(setor.id);

  if (setor.senha) {
    const cookieStore = await cookies();
    const isAuthed = cookieStore.get(`auth_setor_${setor.id}`);
    
    if (!isAuthed) {
      return <PasswordPrompt setorId={setor.id} setorNome={setor.nome} />;
    }
  }

  if (pops.length === 0) {
    return (
      <div className="card text-center py-12">
        <h2 className="text-muted mb-4">Este setor ainda não possui POPs cadastrados.</h2>
        <Link href="/pops/novo" className="btn btn-primary">
          Cadastrar POP
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/setores/${setor.id}`} className="text-primary hover:underline text-sm font-medium">
              &larr; Voltar ao Painel
            </Link>
          </div>
          <h1 className="text-3xl font-bold">{registroExistente ? 'Editar Checklist' : 'Preencher Checklist'}</h1>
          <p className="text-muted flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Setor: {setor.nome}
          </p>
        </div>
      </div>

      <ChecklistForm
        setorId={setor.id}
        pops={pops}
        dataInicial={dataSelecionada}
        respostasIniciais={respostasIniciais}
        responsaveisIniciais={responsaveisIniciais}
        observacoesInicial={observacoesInicial}
        atendentes={atendentes.map((a) => ({ id: a.id, nome: a.nome }))}
      />
    </div>
  );
}
