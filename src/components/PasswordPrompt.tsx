'use client';

import React, { useState } from 'react';
import { verificarSenhaSetor } from '@/actions/setores';
import Link from 'next/link';

interface PasswordPromptProps {
  setorId: string;
  setorNome: string;
}

export default function PasswordPrompt({ setorId, setorNome }: PasswordPromptProps) {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      const result = await verificarSenhaSetor(setorId, senha);
      if (result.success) {
        // O servidor redirecionará ou recarregará a página via revalidatePath
        // Mas por segurança, vamos forçar um reload se nada acontecer
        window.location.reload();
      } else {
        setErro(result.error || 'Senha incorreta');
      }
    } catch (_err) {
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
          <h2 className="text-2xl font-bold">Acesso Restrito</h2>
          <p className="text-muted mt-2">O setor <strong>{setorNome}</strong> é protegido por senha.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="senha" className="form-label">Digite a senha do setor</label>
            <input
              type="password"
              id="senha"
              className="form-input text-center text-xl tracking-widest"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••"
              autoFocus
              required
            />
          </div>

          {erro && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {erro}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-full py-3 text-lg font-semibold flex items-center justify-center gap-2"
            disabled={carregando}
          >
            {carregando ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verificando...
              </>
            ) : (
              'Acessar Setor'
            )}
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
