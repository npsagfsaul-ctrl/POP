import { isAdmin } from '@/actions/admin';
import { getOcorrencias } from '@/actions/ocorrencias';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import PainelComunicados from '@/components/admin/PainelComunicados';
import PainelLembretes from '@/components/admin/PainelLembretes';
import PainelOcorrencias from '@/components/admin/PainelOcorrencias';

export const dynamic = 'force-dynamic';

/**
 * Uma entrada de menu só para as três coisas que a agência "avisa".
 *
 * O conteúdo NÃO foi fundido de propósito: comunicado e lembrete só existem e
 * somem, mas ocorrência tem fluxo (aberta → resolvida). Jogar as três num balde
 * só faria perder o "o que ainda está em aberto", que é o valor da ocorrência.
 */

type Aba = 'comunicados' | 'lembretes' | 'ocorrencias';

const ABAS: { id: Aba; label: string; descricao: string }[] = [
  { id: 'comunicados', label: '📢 Comunicados', descricao: 'Recados no mural, para todo mundo ver.' },
  { id: 'lembretes', label: '📅 Lembretes', descricao: 'Datas que não podem passar em branco.' },
  { id: 'ocorrencias', label: '⚠️ Ocorrências', descricao: 'Problemas abertos pelos setores, para você resolver.' },
];

export default async function AvisosPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  if (!(await isAdmin())) redirect('/admin/login');

  const { aba } = await searchParams;
  const ativa: Aba = ABAS.some((a) => a.id === aba) ? (aba as Aba) : 'comunicados';

  // Ocorrência em aberto é a única que "cobra" alguma coisa — o número fica na
  // aba para não precisar entrar para descobrir que tem trabalho parado.
  const emAberto = (await getOcorrencias()).filter((o) => o.status === 'ABERTA').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Avisos</h1>
          <nav className="breadcrumb">
            <Link href="/" className="breadcrumb-link">Mural</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">Avisos</span>
          </nav>
        </div>
      </div>

      {/* Abas */}
      <div
        style={{
          display: 'flex', gap: 4, flexWrap: 'wrap',
          borderBottom: '1px solid var(--border)', marginBottom: 20,
        }}
      >
        {ABAS.map((a) => {
          const selecionada = a.id === ativa;
          return (
            <Link
              key={a.id}
              href={`/admin/avisos?aba=${a.id}`}
              style={{
                padding: '10px 16px',
                fontSize: '0.875rem',
                fontWeight: selecionada ? 600 : 500,
                color: selecionada ? 'var(--primary)' : 'var(--text-muted)',
                borderBottom: `2px solid ${selecionada ? 'var(--primary)' : 'transparent'}`,
                marginBottom: -1,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {a.label}
              {a.id === 'ocorrencias' && emAberto > 0 && (
                <span className="badge badge-danger" style={{ fontSize: '0.6875rem' }}>{emAberto}</span>
              )}
            </Link>
          );
        })}
      </div>

      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 20 }}>
        {ABAS.find((a) => a.id === ativa)!.descricao}
      </p>

      {ativa === 'comunicados' && <PainelComunicados />}
      {ativa === 'lembretes' && <PainelLembretes />}
      {ativa === 'ocorrencias' && <PainelOcorrencias />}
    </div>
  );
}
