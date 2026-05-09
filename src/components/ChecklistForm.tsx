'use client';

import { salvarChecklist } from '@/actions/checklist';
import { useRef } from 'react';

interface Pop {
  id: string;
  titulo: string;
  peso: number;
  orientacaoAvaliacao: string;
  instrucaoTrabalho: string;
}

interface ChecklistFormProps {
  setorId: string;
  pops: Pop[];
  hoje: string;
}

export default function ChecklistForm({ setorId, pops, hoje }: ChecklistFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const marcarTodosConforme = () => {
    if (!formRef.current) return;
    const checkboxes = formRef.current.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((cb) => {
      (cb as HTMLInputElement).checked = true;
    });
  };

  return (
    <div className="card">
      <form ref={formRef} action={salvarChecklist}>
        <input type="hidden" name="setorId" value={setorId} />
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div className="form-group mb-0 flex-grow">
            <label htmlFor="data" className="form-label">
              Data do Checklist
            </label>
            <input
              type="date"
              id="data"
              name="data"
              defaultValue={hoje}
              className="form-input max-w-xs"
              required
            />
          </div>
          
          <button 
            type="button" 
            onClick={marcarTodosConforme}
            className="btn btn-secondary btn-sm flex items-center gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Tudo Conforme / Nada a Declarar
          </button>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium border-b pb-2 mb-4">Procedimentos (POPs)</h3>
          
          {pops.map((pop) => (
            <div key={pop.id} className="flex items-start p-4 border rounded-lg hover:bg-slate-50 transition-colors bg-white">
              <div className="flex-shrink-0 mt-1">
                <input
                  type="checkbox"
                  id={`pop_${pop.id}`}
                  name={`pop_${pop.id}`}
                  className="w-5 h-5 text-primary rounded border-slate-300 focus:ring-primary cursor-pointer"
                />
              </div>
              <div className="ml-4 flex-grow">
                <label htmlFor={`pop_${pop.id}`} className="font-bold cursor-pointer block text-main mb-1">
                  {pop.titulo}
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 uppercase tracking-wider border border-blue-100">
                    Peso: {pop.peso}
                  </span>
                </label>
                <p className="text-sm text-slate-600 mb-2">
                  <span className="font-semibold text-slate-700">Avaliar:</span> {pop.orientacaoAvaliacao}
                </p>
                <details className="text-xs text-slate-500">
                  <summary className="cursor-pointer text-primary hover:underline font-medium">Instrução de Trabalho</summary>
                  <div className="mt-2 p-3 bg-slate-50 rounded-md border border-slate-100 whitespace-pre-wrap text-slate-600 italic">
                    {pop.instrucaoTrabalho}
                  </div>
                </details>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-8 pt-6 border-t">
          <button type="submit" className="btn btn-primary px-10 py-3 text-lg shadow-lg">
            Finalizar Checklist
          </button>
        </div>
      </form>
    </div>
  );
}
