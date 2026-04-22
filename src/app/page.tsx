import { getSetores } from '@/actions/setores';
import Link from 'next/link';

export default async function Home() {
  const setores = await getSetores();

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1>Setores</h1>
      </div>

      {setores.length === 0 ? (
        <div className="card text-center py-12">
          <h2 className="text-muted mb-4">Nenhum setor cadastrado ainda.</h2>
          <Link href="/setores/novo" className="btn btn-primary">
            Cadastrar Primeiro Setor
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {setores.map((setor) => (
            <Link key={setor.id} href={`/setores/${setor.id}`} className="card block hover:no-underline text-main">
              <h2 className="text-xl mb-2">{setor.nome}</h2>
              <p className="text-muted">
                {setor._count.pops} {setor._count.pops === 1 ? 'POP cadastrado' : 'POPs cadastrados'}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
