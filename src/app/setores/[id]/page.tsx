import { prisma } from '@/lib/prisma';
import { getPopsBySetor } from '@/actions/pops';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function VisualizarSetor({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const setor = await prisma.setor.findUnique({
    where: { id: resolvedParams.id },
  });

  if (!setor) {
    notFound();
  }

  const pops = await getPopsBySetor(resolvedParams.id);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <Link href="/" className="text-muted text-sm hover:underline mb-2 inline-block">
            &larr; Voltar para Setores
          </Link>
          <h1>Setor: {setor.nome}</h1>
        </div>
        <Link href="/pops/novo" className="btn btn-primary">
          Novo POP neste Setor
        </Link>
      </div>

      {pops.length === 0 ? (
        <div className="card text-center py-12">
          <h2 className="text-muted mb-4">Nenhum POP cadastrado neste setor ainda.</h2>
        </div>
      ) : (
        <div className="grid grid-cols-1">
          {pops.map((pop) => (
            <div key={pop.id} className="card">
              <h2 className="text-2xl mb-4 text-primary">{pop.titulo}</h2>
              
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
      )}
    </div>
  );
}
