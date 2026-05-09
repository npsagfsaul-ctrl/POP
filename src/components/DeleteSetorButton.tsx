'use client';

import { deleteSetor } from '@/actions/setores';
import { useTransition } from 'react';

interface DeleteSetorButtonProps {
  setorId: string;
  setorNome: string;
}

export default function DeleteSetorButton({ setorId, setorNome }: DeleteSetorButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirm(`Tem certeza que deseja excluir o setor "${setorNome}"? TODOS os POPs e registros deste setor serão APAGADOS permanentemente.`)) {
      startTransition(async () => {
        await deleteSetor(setorId);
      });
    }
  };

  return (
    <button 
      onClick={handleDelete}
      disabled={isPending}
      className="btn btn-secondary text-rose-600 hover:bg-rose-50 border-rose-200 flex items-center gap-2"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      {isPending ? 'Excluindo...' : 'Excluir Setor'}
    </button>
  );
}
