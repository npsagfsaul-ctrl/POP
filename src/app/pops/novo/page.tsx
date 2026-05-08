import { createPop } from '@/actions/pops';
import { getSetores } from '@/actions/setores';
import Link from 'next/link';

export default async function NovoPop() {
  const setores = await getSetores();

  if (setores.length === 0) {
    return (
      <div className="card text-center py-12">
        <h2 className="text-muted mb-4">Você precisa criar um setor primeiro.</h2>
        <Link href="/setores/novo" className="btn btn-primary">
          Cadastrar Setor
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="mb-8">Cadastrar Novo POP</h1>
      
      <div className="card">
        <form action={createPop}>
          <div className="form-group">
            <label htmlFor="titulo" className="form-label">
              Título do Procedimento
            </label>
            <input
              type="text"
              id="titulo"
              name="titulo"
              className="form-input"
              placeholder="Ex: Recebimento de Mercadorias"
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
              placeholder="Ex: 1, 2, 3, 5"
              defaultValue={1}
              min={1}
              max={10}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="setorId" className="form-label">
              Setor Responsável
            </label>
            <select id="setorId" name="setorId" className="form-select" required>
              <option value="">Selecione um setor...</option>
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
              placeholder="Descreva como este procedimento será avaliado..."
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
              placeholder="Descreva o passo a passo detalhado do procedimento..."
              required
            ></textarea>
          </div>

          <div className="flex justify-end gap-4 mt-8">
            <Link href="/" className="btn btn-secondary">
              Cancelar
            </Link>
            <button type="submit" className="btn btn-primary">
              Salvar POP
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
