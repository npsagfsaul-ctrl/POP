'use client';

import { alternarPopAtivo } from '@/actions/pops';
import { useTransition } from 'react';

interface PopAtivoButtonProps {
  popId: string;
  setorId: string;
  popTitulo: string;
  ativo: boolean;
}

export default function PopAtivoButton({ popId, setorId, popTitulo, ativo }: PopAtivoButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    const msg = ativo
      ? `Desativar o POP "${popTitulo}"?\n\nEle sai do checklist a partir de amanhã. Os dias em que ele já valia continuam contando normalmente — nenhum mês fechado muda de nota.`
      : `Reativar o POP "${popTitulo}"?\n\nEle volta a ser cobrado no checklist a partir de amanhã.`;
    if (!confirm(msg)) return;
    startTransition(async () => {
      await alternarPopAtivo(popId, setorId, !ativo);
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="btn btn-secondary btn-sm"
      title={ativo ? 'Aposenta o POP preservando o histórico' : 'Volta a cobrar este POP'}
    >
      {isPending ? '...' : ativo ? 'Desativar' : 'Reativar'}
    </button>
  );
}
