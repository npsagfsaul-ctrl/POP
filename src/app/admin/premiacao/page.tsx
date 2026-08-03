import { isAdmin } from '@/actions/admin';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getResumoPremiacao, definirFaixasPremiacao } from '@/actions/premiacao';
import { META_CONFORMIDADE } from '@/lib/conformidade';

export const dynamic = 'force-dynamic';

const NOME_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function corFatia(fatia: number) {
  if (fatia === 100) return 'badge-success';
  if (fatia === 75) return 'badge-info';
  if (fatia === 50) return 'badge-warning';
  return 'badge-danger';
}

export default async function PremiacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ano?: string }>;
}) {
  if (!(await isAdmin())) notFound();

  const sp = await searchParams;
  const hoje = new Date();
  const mes = sp.mes ? parseInt(sp.mes, 10) : hoje.getMonth() + 1;
  const ano = sp.ano ? parseInt(sp.ano, 10) : hoje.getFullYear();

  const { faixas, pessoas, setores } = await getResumoPremiacao(mes, ano);

  const prevMes = mes === 1 ? 12 : mes - 1;
  const prevAno = mes === 1 ? ano - 1 : ano;
  const nextMes = mes === 12 ? 1 : mes + 1;
  const nextAno = mes === 12 ? ano + 1 : ano;

  const totalSemResponsavel = setores.reduce((a, s) => a + s.semResponsavel, 0);
  const comPerda = pessoas.filter((p) => p.fatiaPremio < 100);

  return (
    <div>
      <div className="page-header">
        <div>
          <nav className="breadcrumb" style={{ marginBottom: 4 }}>
            <Link href="/" className="breadcrumb-link">Mural</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">Fechamento do Prêmio</span>
          </nav>
          <h1 className="page-title">Fechamento do Prêmio</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 4 }}>
          <Link href={`/admin/premiacao?mes=${prevMes}&ano=${prevAno}`} style={{ padding: '2px 10px', color: 'var(--text-muted)' }}>‹</Link>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, padding: '0 8px' }}>{NOME_MESES[mes - 1]} de {ano}</span>
          <Link href={`/admin/premiacao?mes=${nextMes}&ano=${nextAno}`} style={{ padding: '2px 10px', color: 'var(--text-muted)' }}>›</Link>
        </div>
      </div>

      {/* Faixas */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Faixas de desconto</div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: -4, marginBottom: 12 }}>
          Estas faixas só entram em ação <strong>quando o setor fica abaixo da meta</strong>. Se o setor
          bateu os {META_CONFORMIDADE}%, o time inteiro recebe integral, sem desconto nenhum. Abaixo da
          meta, cada pessoa mantém a fatia correspondente ao <strong>peso acumulado</strong> das
          pendências apontadas para ela. O sistema não calcula valores — ele diz a fatia, e você aplica
          sobre o valor do prêmio.
        </p>
        <form action={definirFaixasPremiacao} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: 150 }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Até este peso, mantém 100%</label>
            <input name="limiteIntegral" type="number" min={0} className="form-input" defaultValue={faixas.limiteIntegral} required />
          </div>
          <div style={{ minWidth: 150 }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Até este peso, mantém 75%</label>
            <input name="limite75" type="number" min={0} className="form-input" defaultValue={faixas.limite75} required />
          </div>
          <div style={{ minWidth: 150 }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Até este peso, mantém 50%</label>
            <input name="limite50" type="number" min={0} className="form-input" defaultValue={faixas.limite50} required />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" style={{ height: 38 }}>Salvar faixas</button>
        </form>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 10, marginBottom: 0 }}>
          Acima de {faixas.limite50} de peso, a pessoa perde o prêmio inteiro.
        </p>
      </div>

      {/* Situação dos setores */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Setores no mês</div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: -4, marginBottom: 12 }}>
          Setor <strong>na meta</strong>: todo o time recebe integral. Setor <strong>abaixo da meta</strong>:
          aí sim entra a conta individual, para quem quase não errou não pagar pelo erro dos outros.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {setores.map((s) => {
            const c = s.concentracao;
            const principal = c.porPessoa[0];
            return (
              <div
                key={s.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                  padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)', background: 'var(--surface)',
                }}
              >
                <span className={`badge ${s.bateuMeta ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.75rem' }}>
                  {s.percentual}%
                </span>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.nome}</span>

                {c.diasPerdidos > 0 ? (
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    perdeu {c.diasPerdidos} dia(s)
                    {principal
                      ? ` — em ${principal.diasSozinho}, ${principal.nome} foi a única responsável`
                      : c.diasSemResponsavel === c.diasPerdidos
                        ? ' — sem responsável apontado'
                        : ''}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.8125rem', color: 'var(--success)' }}>nenhum dia perdido</span>
                )}
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 12, marginBottom: 0 }}>
          Quando a maior parte dos dias perdidos vem de uma pessoa só, o problema é individual e não
          do time — a decisão de poupar ou não o setor continua sendo sua. Meses anteriores à criação
          do campo de responsável aparecem como &quot;sem responsável apontado&quot;.
        </p>
      </div>

      {totalSemResponsavel > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          <strong>{totalSemResponsavel} pendência(s)</strong> deste mês estão sem responsável indicado e
          não entram em nenhuma conta individual. Vale conferir antes de fechar — se esse número for alto,
          pode ser sinal de que o campo não está sendo preenchido no checklist.
        </div>
      )}

      {/* Pessoas */}
      <div className="card" style={{ padding: 0 }}>
        <div className="card-title" style={{ padding: '16px 20px 0' }}>
          Pessoas com pendências
          <span className="badge badge-primary" style={{ marginLeft: 8, fontSize: '0.75rem' }}>{pessoas.length}</span>
          {comPerda.length > 0 && (
            <span className="badge badge-warning" style={{ marginLeft: 6, fontSize: '0.75rem' }}>
              {comPerda.length} com desconto
            </span>
          )}
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Funcionário</th>
                <th>Setor</th>
                <th style={{ textAlign: 'center' }}>Pendências</th>
                <th style={{ textAlign: 'center' }}>Em quantos dias</th>
                <th style={{ textAlign: 'center' }}>Peso acumulado</th>
                <th style={{ textAlign: 'center' }}>Mantém do prêmio</th>
              </tr>
            </thead>
            <tbody>
              {pessoas.map((p) => (
                <tr key={`${p.setorId}-${p.atendenteId}`}>
                  <td style={{ fontWeight: 600 }}>
                    {p.nome}
                    {p.removido && (
                      <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--danger)' }}>
                        excluído do cadastro
                      </span>
                    )}
                  </td>
                  <td>
                    {p.setorNome}
                    {!p.setorBateuMeta && (
                      <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        setor não bateu a meta ({p.setorPercentual}%)
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>{p.totalPendencias}</td>
                  <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{p.diasDistintos}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>{p.pesoTotal}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`badge ${corFatia(p.fatiaPremio)}`} style={{ fontSize: '0.75rem' }}>
                      {p.fatiaPremio}%
                    </span>
                  </td>
                </tr>
              ))}
              {pessoas.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                    Nenhuma pendência com responsável indicado em {NOME_MESES[mes - 1]} de {ano}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 12 }}>
        Quem não aparece nesta lista não teve nenhuma pendência apontada e mantém o prêmio integral.
        Esta tela mostra o cálculo — a decisão do fechamento continua sendo sua.
      </p>
    </div>
  );
}
