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

  const colaboradores = await getColaboradoresComSaldo();
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
    </div>
  );
}
