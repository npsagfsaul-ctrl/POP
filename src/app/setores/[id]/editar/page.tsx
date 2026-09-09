import { getSetorById, updateSetor } from '@/actions/setores';
import { parseDiasExpediente } from '@/lib/expediente';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function EditarSetor({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const setor = await getSetorById(resolvedParams.id);

  if (!setor) {
    notFound();
  }

  // Criamos uma versão da action que já sabe o ID do setor
  const updateSetorWithId = updateSetor.bind(null, setor.id);
  const diasAtuais = parseDiasExpediente(setor.diasExpediente);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/setores/${setor.id}`} className="text-muted hover:text-primary transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <h1>Editar Setor: {setor.nome}</h1>
      </div>
      
      <div className="card">
        <form action={updateSetorWithId}>
          <div className="form-group">
            <label htmlFor="nome" className="form-label">
              Nome do Setor
            </label>
            <input
              type="text"
              id="nome"
              name="nome"
              className="form-input"
              defaultValue={setor.nome}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="senha" className="form-label">
              Nova Senha de Acesso (Opcional)
            </label>
            <input
              type="password"
              id="senha"
              name="senha"
              className="form-input"
              placeholder="Deixe em branco para remover a senha"
              defaultValue={setor.senha || ''}
            />
            <p className="text-xs text-muted mt-2">
              Se você preencher, essa será a nova senha do setor. Se apagar e salvar, o setor ficará com acesso livre.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Dias de expediente</label>
            <p className="text-xs text-muted" style={{ marginBottom: 10 }}>
              Só os dias marcados entram na conta da nota. Domingo nunca conta.
              Dia sem expediente não é dia perdido — ele simplesmente não existe
              para este setor.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {([[1, 'Segunda'], [2, 'Terça'], [3, 'Quarta'], [4, 'Quinta'], [5, 'Sexta'], [6, 'Sábado']] as [number, string][])
                .map(([n, rotulo]) => (
                  <label key={n} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      name={`dia_${n}`}
                      defaultChecked={diasAtuais.includes(n)}
                    />
                    {rotulo}
                  </label>
                ))}
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-8 border-t pt-6">
            <Link href={`/setores/${setor.id}`} className="btn btn-secondary">
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
