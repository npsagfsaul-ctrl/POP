import Link from 'next/link';
import { isAdmin } from '@/actions/admin';
import { getColaboradoresComSaldo } from '@/actions/horas';
import SaldosEmLote from '@/components/SaldosEmLote';

export const dynamic = 'force-dynamic';

export default async function HorasPage() {
  if (!(await isAdmin())) {
    return (
      <div className="alert alert-info">
        O controle de horas é do Departamento Pessoal.{' '}
        <Link href="/admin/login" style={{ textDecoration: 'underline' }}>Entre como Administrador</Link>.
      </div>
    );
  }

  const todos = await getColaboradoresComSaldo();

  // Contrato sem banco de horas sai da lista do fechamento, mas não some da
  // tela: continua embaixo, nomeado, para ninguém se perguntar onde foi parar.
  const colaboradores = todos.filter((c) => c.controlaHoras);
  const foraDoControle = todos.filter((c) => !c.controlaHoras);
  const devendo = colaboradores.filter((c) => c.saldoMinutos < 0);

  /**
   * Agrupado por setor: são mais de vinte pessoas, e numa lista só o DP fica
   * procurando quem é de onde. Quem está sem setor cai num grupo próprio no
   * fim, em vez de sumir no meio.
   */
  const porSetor = new Map<string, typeof colaboradores>();
  for (const c of colaboradores) {
    const chave = c.setorNome ?? '';
    porSetor.set(chave, [...(porSetor.get(chave) ?? []), c]);
  }
  const grupos = [...porSetor.entries()]
    .sort(([a], [b]) => {
      if (a === '') return 1;
      if (b === '') return -1;
      return a.localeCompare(b, 'pt-BR');
    })
    .map(([setor, lista]) => ({
      setor,
      colaboradores: lista.map((c) => ({ id: c.id, nome: c.nome, saldoMinutos: c.saldoMinutos })),
    }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Controle de Horas</h1>
          <nav className="breadcrumb">
            <Link href="/" className="breadcrumb-link">Mural</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">
              {devendo.length > 0 ? `${devendo.length} devendo` : 'Todos em dia'}
            </span>
          </nav>
        </div>
      </div>

      {colaboradores.length === 0 ? (
        <div className="card">
          <p className="text-muted" style={{ margin: 0 }}>
            Nenhum colaborador cadastrado.{' '}
            <Link href="/prospeccao/cadastros" style={{ textDecoration: 'underline' }}>Cadastre os funcionários</Link>.
          </p>
        </div>
      ) : (
        <SaldosEmLote grupos={grupos} />
      )}

      {foraDoControle.length > 0 && (
        <details className="card" style={{ marginTop: 12 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.9375rem' }}>
            Fora do controle de horas
            <span className="badge badge-primary" style={{ marginLeft: 8, fontSize: '0.75rem' }}>
              {foraDoControle.length}
            </span>
          </summary>
          <p className="form-hint" style={{ marginTop: 12 }}>
            Contrato sem banco de horas. Continuam no sistema para Coletas e
            Prospecção — só não entram no fechamento.
          </p>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {foraDoControle.map((c) => (
              <li key={c.id} style={{ marginBottom: 4 }}>
                {c.nome}
                {c.setorNome && <span className="text-muted"> · {c.setorNome}</span>}{' '}
                <Link href={`/horas/${c.id}`} style={{ textDecoration: 'underline', fontSize: '0.8125rem' }}>
                  trazer de volta
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
