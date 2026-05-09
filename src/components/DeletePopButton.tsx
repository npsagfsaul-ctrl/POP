'use client';

import { deletePop } from '@/actions/pops';
import { useTransition } from 'react';

interface DeletePopButtonProps {
  popId: string;
  setorId: string;
  popTitulo: string;
}

export default function DeletePopButton({ popId, setorId, popTitulo }: DeletePopButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirm(`Tem certeza que deseja excluir o POP "${popTitulo}"? Esta ação não pode ser desfeita.`)) {
      startTransition(async () => {
        await deletePop(popId, setorId);
      });
    }
  };

  return (
    <button 
      onClick={handleDelete}
      disabled={isPending}
      className="text-rose-500 hover:text-rose-700 font-medium text-sm flex items-center gap-1 transition-colors disabled:opacity-50"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      {isPending ? 'Excluindo...' : 'Excluir'}
    </button>
  );
}
