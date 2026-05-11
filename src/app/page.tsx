import { getSetores } from '@/actions/setores';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const setores = await getSetores();

  return (
    <div className="py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
        <div>
          <h1 className="text-5xl font-black text-white mb-2 tracking-tighter">Setores Operacionais</h1>
          <p className="text-slate-400 text-lg font-medium">Monitoramento de conformidade e gestão de POPs em tempo real.</p>
        </div>
        <Link href="/setores/novo" className="btn btn-primary px-8 py-4 shadow-[0_0_20px_rgba(56,189,248,0.2)]">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Novo Setor
        </Link>
      </div>

      {setores.length === 0 ? (
        <div className="card text-center py-20 bg-slate-800/30 border-dashed border-2 border-slate-700">
          <div className="w-20 h-20 bg-slate-900/50 text-slate-500 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/5">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Nenhum setor cadastrado</h2>
          <p className="text-slate-400 mb-8 max-w-sm mx-auto">Comece criando o primeiro setor para organizar seus procedimentos operacionais.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {setores.map((setor) => (
            <Link key={setor.id} href={`/setores/${setor.id}`} className="card group hover:no-underline flex flex-col h-full hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-500 bg-slate-800/40 border-white/5 p-6 rounded-[2rem]">
              <div className="flex justify-between items-center mb-6">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform border border-white/5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                {setor.senha && (
                  <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    Restrito
                  </span>
                )}
              </div>
              
              <h2 className="text-2xl font-black text-white mb-2 group-hover:text-primary transition-colors tracking-tight">{setor.nome}</h2>
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest">
                <span className="text-primary">{setor._count.pops}</span>
                {setor._count.pops === 1 ? 'procedimento' : 'procedimentos'}
              </div>
              
              <div className="mt-auto pt-8 flex items-center justify-between">
                 <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-6 h-6 rounded-full border-2 border-slate-800 bg-slate-700 flex items-center justify-center text-[8px] font-bold text-slate-400">
                        {String.fromCharCode(64 + i)}
                      </div>
                    ))}
                 </div>
                 <div className="text-primary font-black text-[10px] uppercase tracking-widest group-hover:translate-x-1 transition-transform flex items-center gap-2">
                    Abrir Painel
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                 </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
