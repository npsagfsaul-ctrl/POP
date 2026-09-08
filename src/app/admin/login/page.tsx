'use client';

import { useState } from 'react';
import { loginAdmin } from '@/actions/admin';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * Entrada do administrador.
 *
 * A versão anterior tinha sido escrita para um tema escuro que o sistema não
 * usa (bg-slate-950, text-white) e chamava a classe `input`, que não existe no
 * CSS daqui — o certo é `form-input`. O resultado era um campo de senha cinza
 * escuro, com cara de desabilitado. Esta tela agora segue o mesmo padrão da
 * senha de setor (PasswordPrompt), que é a irmã dela.
 */
export default function AdminLoginPage() {
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErro('');

    try {
      const result = await loginAdmin(senha);
      if (result.success) {
        router.push('/');
        router.refresh();
      } else {
        setErro(result.error || 'Senha incorreta.');
        setCarregando(false);
      }
    } catch {
      setErro('Não foi possível entrar. Tente de novo em instantes.');
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="card max-w-md w-full p-8 shadow-xl border-t-4 border-primary">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold">Acesso do administrador</h2>
          <p className="text-muted mt-2">Área restrita para gerenciar o sistema.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="senha" className="form-label">Senha do administrador</label>
            <div style={{ position: 'relative' }}>
              <input
                type={mostrarSenha ? 'text' : 'password'}
                id="senha"
                name="senha"
                autoComplete="current-password"
                className="form-input text-center text-xl tracking-widest"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••"
                autoFocus
                required
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                }}
                title={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {mostrarSenha ? (
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {erro && (
            <div className="alert alert-danger" style={{ marginBottom: 16 }}>
              {erro}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-full py-3 text-lg font-semibold"
            disabled={carregando}
          >
            {carregando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-muted hover:text-primary transition-colors">
            ← Voltar ao mural
          </Link>
        </div>
      </div>
    </div>
  );
}
