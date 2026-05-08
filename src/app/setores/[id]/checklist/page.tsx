import { getSetorById } from '@/actions/setores';
import { getPopsBySetor } from '@/actions/pops';
import { salvarChecklist } from '@/actions/checklist';
import PasswordPrompt from '@/components/PasswordPrompt';
import Link from 'next/link';
import { cookies } from 'next/headers';

export default async function ChecklistDiario({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const setor = await getSetorById(resolvedParams.id);
  const pops = await getPopsBySetor(resolvedParams.id);
  
  // Data atual no formato YYYY-MM-DD para o input padrão
  const hoje = new Date().toISOString().split('T')[0];

  if (!setor) {
    return <div className="text-center py-12">Setor não encontrado.</div>;
  }

  // Verificar proteção por senha
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
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="mb-2">Checklist Diário</h1>
          <p className="text-muted">Setor: {setor.nome}</p>
        </div>
        <Link href={`/setores/${setor.id}`} className="btn btn-secondary">
          Voltar
        </Link>
      </div>

      <div className="card">
        <form action={salvarChecklist}>
          <input type="hidden" name="setorId" value={setor.id} />
          
          <div className="form-group mb-8">
            <label htmlFor="data" className="form-label">
              Data do Checklist
            </label>
            <input
              type="date"
              id="data"
              name="data"
              defaultValue={hoje}
              className="form-input max-w-xs"
              required
            />
            <p className="text-sm text-muted mt-1">
              Selecione a data referente a esta avaliação.
            </p>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-medium border-b pb-2">Procedimentos (POPs)</h3>
            
            {pops.map((pop) => (
              <div key={pop.id} className="flex items-start p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0 mt-1">
                  <input
                    type="checkbox"
                    id={`pop_${pop.id}`}
                    name={`pop_${pop.id}`}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="ml-4 flex-grow">
                  <label htmlFor={`pop_${pop.id}`} className="font-medium cursor-pointer block">
                    {pop.titulo}
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      Peso: {pop.peso}
                    </span>
                  </label>
                  <p className="text-sm text-gray-600 mt-1 mb-2">
                    <span className="font-semibold">Orientação:</span> {pop.orientacaoAvaliacao}
                  </p>
                  <details className="text-sm text-gray-500">
                    <summary className="cursor-pointer text-blue-600 hover:text-blue-800">Ver instrução de trabalho</summary>
                    <div className="mt-2 p-3 bg-gray-50 rounded whitespace-pre-wrap">
                      {pop.instrucaoTrabalho}
                    </div>
                  </details>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-8 pt-4 border-t">
            <button type="submit" className="btn btn-primary px-8 py-3 text-lg">
              Salvar Checklist
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
