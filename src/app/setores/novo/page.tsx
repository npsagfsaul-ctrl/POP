import { createSetor } from '@/actions/setores';

export default function NovoSetor() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="mb-8">Cadastrar Novo Setor</h1>
      
      <div className="card">
        <form action={createSetor}>
          <div className="form-group">
            <label htmlFor="nome" className="form-label">
              Nome do Setor
            </label>
            <input
              type="text"
              id="nome"
              name="nome"
              className="form-input"
              placeholder="Ex: Logística, Recursos Humanos..."
              required
            />
          </div>

          <div className="flex justify-end gap-4 mt-8">
            <button type="submit" className="btn btn-primary">
              Salvar Setor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
