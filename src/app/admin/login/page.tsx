'use client';

import { useState } from 'react';
import { loginAdmin } from '@/actions/admin';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await loginAdmin(password);

    if (result.success) {
      router.push('/');
      router.refresh();
    } else {
      setError(result.error || 'Erro ao entrar');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="card max-w-md w-full p-10 bg-slate-800/50 border-slate-700/50">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mx-auto mb-4 border border-primary/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase">Acesso ADM</h1>
          <p className="text-slate-400 text-sm mt-2">Área restrita para gerenciamento do sistema.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Senha do Administrador</label>
            <input
              type="password"
              className="input w-full bg-slate-950/50 border-slate-700 text-white placeholder:text-slate-700"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-xs font-bold text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-full py-4 text-sm font-black uppercase tracking-widest shadow-[0_0_20px_rgba(56,189,248,0.2)]"
            disabled={loading}
          >
            {loading ? 'Validando...' : 'Entrar no Sistema'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => router.push('/')}
            className="text-slate-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
          >
            ← Voltar para Setores
          </button>
        </div>
      </div>
    </div>
  );
}
