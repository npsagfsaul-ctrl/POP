import { getSetores } from '@/actions/setores';
import Link from 'next/link';

export default async function Home() {
  const setores = await getSetores();

  return (
    <div className="py-8">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-4xl font-extrabold text-main mb-2">Setores Operacionais</h1>
          <p className="text-muted text-lg">Selecione um setor para gerenciar seus POPs e acompanhar o desempenho.</p>
        </div>
      </div>

      {setores.length === 0 ? (
        <div className="card text-center py-12 bg-white border-dashed border-2">
          <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Nenhum setor cadastrado</h2>
          <p className="text-muted mb-6 max-w-sm mx-auto">Comece criando o primeiro setor para organizar seus procedimentos.</p>
          <Link href="/setores/novo" className="btn btn-primary px-6 py-3">
            Cadastrar Setor
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {setores.map((setor) => (
            <Link key={setor.id} href={`/setores/${setor.id}`} className="card group hover:no-underline text-main flex flex-col h-full hover:shadow-xl transition-all duration-300 border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <div className="w-10 h-10 bg-primary-light text-primary rounded-lg flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                {setor.senha && (
                  <span className="badge badge-yellow scale-90 origin-right flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    Restrito
                  </span>
                )}
              </div>
              
              <h2 className="text-xl font-bold mb-1 group-hover:text-primary transition-colors">{setor.nome}</h2>
              <p className="text-sm text-muted">
                {setor._count.pops} {setor._count.pops === 1 ? 'procedimento' : 'procedimentos'}
              </p>
              
              <div className="mt-6 pt-4 border-t border-slate-50 flex items-center text-primary font-bold text-xs uppercase tracking-wider">
                Ver Dashboard
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
