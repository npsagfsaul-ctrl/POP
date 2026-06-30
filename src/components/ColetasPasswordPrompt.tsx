'use client';

import React, { useState } from 'react';
import { verificarSenhaColetas } from '@/actions/coletasAcesso';
import Link from 'next/link';

export default function ColetasPasswordPrompt() {
  const [senha, setSenha] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      const result = await verificarSenhaColetas(senha);
      if (result.success) {
        window.location.reload();
      } else {
        setErro(result.error || 'Senha incorreta');
      }
    } catch {
      setErro('Erro ao verificar senha. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="card max-w-md w-full p-8 shadow-xl border-t-4 border-primary">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold">Acesso às Coletas</h2>
          <p className="text-muted mt-2">Esta área é protegida por senha.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="senha-coletas" className="form-label">Digite a senha</label>
            <div style={{ position: 'relative' }}>
              <input
                type={mostrar ? 'text' : 'password'}
                id="senha-coletas"
                className="form-input text-center text-xl tracking-widest"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••"
                autoFocus
                required
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setMostrar(!mostrar)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                title={mostrar ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {mostrar ? (
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
            <div className="alert alert-danger" style={{ marginBottom: 12 }}>{erro}</div>
          )}

          <button type="submit" className="btn btn-primary w-full py-3 text-lg font-semibold" disabled={carregando}>
            {carregando ? 'Verificando…' : 'Acessar Coletas'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-muted hover:text-primary transition-colors">
            Voltar para a página inicial
          </Link>
        </div>
      </div>
    </div>
  );
}
