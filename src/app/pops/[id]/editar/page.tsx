import { getPopById, updatePop } from '@/actions/pops';
import { getSetores } from '@/actions/setores';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function EditarPop({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const pop = await getPopById(resolvedParams.id);
  const setores = await getSetores();

  if (!pop) {
    notFound();
  }

  const updatePopWithId = updatePop.bind(null, pop.id);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/setores/${pop.setorId}`} className="btn btn-secondary p-2 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <h1 className="m-0 text-3xl">Editar POP</h1>
      </div>
      
      <div className="card">
        <form action={updatePopWithId}>
          <div className="form-group">
            <label htmlFor="titulo" className="form-label">
              Título do Procedimento
            </label>
            <input
              type="text"
              id="titulo"
              name="titulo"
              className="form-input"
              defaultValue={pop.titulo}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="peso" className="form-label">
              Peso do POP na Avaliação
            </label>
            <input
              type="number"
              id="peso"
              name="peso"
              className="form-input"
              defaultValue={pop.peso}
              min={1}
              max={10}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="setorId" className="form-label">
              Setor Responsável
            </label>
            <select id="setorId" name="setorId" className="form-select" defaultValue={pop.setorId} required>
              {setores.map((setor) => (
                <option key={setor.id} value={setor.id}>
                  {setor.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="orientacaoAvaliacao" className="form-label">
              Orientação da Forma de Avaliação
            </label>
            <textarea
              id="orientacaoAvaliacao"
              name="orientacaoAvaliacao"
              className="form-textarea"
              defaultValue={pop.orientacaoAvaliacao}
              required
            ></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="instrucaoTrabalho" className="form-label">
              Instrução de Trabalho
            </label>
            <textarea
              id="instrucaoTrabalho"
              name="instrucaoTrabalho"
              className="form-textarea"
              style={{ minHeight: '200px' }}
              defaultValue={pop.instrucaoTrabalho}
              required
            ></textarea>
          </div>

          <div className="flex justify-end gap-4 mt-8">
            <Link href={`/setores/${pop.setorId}`} className="btn btn-secondary">
              Cancelar
            </Link>
            <button type="submit" className="btn btn-primary">
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
