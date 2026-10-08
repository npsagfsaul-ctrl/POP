import { Fragment } from 'react';
import Link from 'next/link';
import { isAdmin } from '@/actions/admin';
import { getColaboradoresComSaldo } from '@/actions/horas';
import { formatarHoras } from '@/lib/horas';

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
  const grupos = [...porSetor.entries()].sort(([a], [b]) => {
    if (a === '') return 1;
    if (b === '') return -1;
    return a.localeCompare(b, 'pt-BR');
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Controle de Horas</h1>
          <nav className="breadcrumb">
            <Link href="/" className="breadcrumb-link">Mural</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">Controle de Horas</span>
          </nav>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          Saldo por colaborador
          {devendo.length > 0 && (
            <span className="badge badge-danger" style={{ marginLeft: 8, fontSize: '0.75rem' }}>
              {devendo.length} devendo
            </span>
          )}
        </div>

        <p className="form-hint" style={{ marginTop: -8, marginBottom: 14 }}>
          O saldo oficial é o do sistema de ponto. Aqui você registra o que foi
          acertado a partir dele — quem compensou, quem faltou, o que foi abonado.
        </p>

        {colaboradores.length === 0 ? (
          <p className="text-muted">
            Nenhum colaborador cadastrado.{' '}
            <Link href="/prospeccao/cadastros" style={{ textDecoration: 'underline' }}>Cadastre os funcionários</Link>.
          </p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Colaborador</th>
                  <th style={{ textAlign: 'left' }}>Jornada</th>
                  <th style={{ textAlign: 'right' }}>Saldo</th>
                  <th style={{ textAlign: 'right' }}>Lançamentos</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {grupos.map(([setorNome, doSetor]) => (
                  <Fragment key={setorNome || 'sem-setor'}>
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          background: 'var(--surface-2)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {setorNome || 'Sem setor'}
                        <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                          {' '}· {doSetor.length} pessoa(s)
                          {doSetor.some((c) => c.saldoMinutos < 0) &&
                            `, ${doSetor.filter((c) => c.saldoMinutos < 0).length} devendo`}
                        </span>
                        {!setorNome && (
                          <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                            {' '}—{' '}
                            <Link href="/prospeccao/cadastros" style={{ textDecoration: 'underline' }}>
                              defina o setor no cadastro
                            </Link>
                          </span>
                        )}
                      </td>
                    </tr>

                    {doSetor.map((c) => {
                  const deve = c.saldoMinutos < 0;
                  const zerado = c.saldoMinutos === 0;
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.nome}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                        {c.jornadaResumo || '—'}
                      </td>
                      <td style={{
                        textAlign: 'right',
                        fontFamily: 'monospace',
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        color: zerado ? 'var(--text-muted)' : deve ? 'var(--danger)' : 'var(--success)',
                      }}>
                        {formatarHoras(c.saldoMinutos, true)}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{c.lancamentos}</td>
                      <td style={{ textAlign: 'right' }}>
                        <Link href={`/horas/${c.id}`} className="btn btn-outline btn-sm">Abrir</Link>
                      </td>
                    </tr>
                  );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
