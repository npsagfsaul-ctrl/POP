import { isAdmin } from '@/actions/admin';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSimulacaoReguas } from '@/actions/premiacao';
import { META_CONFORMIDADE } from '@/lib/conformidade';

export const dynamic = 'force-dynamic';

const NOME_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default async function SimuladorPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ano?: string }>;
}) {
  if (!(await isAdmin())) notFound();

  const sp = await searchParams;
  const hoje = new Date();
  const mes = sp.mes ? parseInt(sp.mes, 10) : hoje.getMonth() + 1;
  const ano = sp.ano ? parseInt(sp.ano, 10) : hoje.getFullYear();

  const simulacao = await getSimulacaoReguas(mes, ano);

  const prevMes = mes === 1 ? 12 : mes - 1;
  const prevAno = mes === 1 ? ano - 1 : ano;
  const nextMes = mes === 12 ? 1 : mes + 1;
  const nextAno = mes === 12 ? ano + 1 : ano;

  // Cabeçalhos das réguas (todos os setores têm a mesma lista, na mesma ordem).
  const colunas = simulacao.find((s) => s.reguas.length > 0)?.reguas ?? [];

  const passamPorRegua = colunas.map((c, i) => ({
    nome: c.nome,
    quantos: simulacao.filter((s) => s.reguas[i]?.bateu).length,
  }));

  return (
    <div>
      <div className="page-header">
        <div>
          <nav className="breadcrumb" style={{ marginBottom: 4 }}>
            <Link href="/" className="breadcrumb-link">Mural</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">Comparar réguas</span>
          </nav>
          <h1 className="page-title">Comparar réguas</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 4 }}>
          <Link href={`/admin/simulador?mes=${prevMes}&ano=${prevAno}`} style={{ padding: '2px 10px', color: 'var(--text-muted)' }}>‹</Link>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, padding: '0 8px' }}>{NOME_MESES[mes - 1]} de {ano}</span>
          <Link href={`/admin/simulador?mes=${nextMes}&ano=${nextAno}`} style={{ padding: '2px 10px', color: 'var(--text-muted)' }}>›</Link>
        </div>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 20 }}>
        <strong>Esta tela não altera nada.</strong> Ela mostra o mesmo mês, com os mesmos dados,
        calculado de quatro formas diferentes — para você comparar antes de decidir se vale trocar
        a régua oficial. Hoje vale a <strong>Zero tolerância</strong>, e a meta é {META_CONFORMIDADE}%.
      </div>

      <div className="card" style={{ padding: 0, marginBottom: 20 }}>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Setor</th>
                <th style={{ textAlign: 'center' }}>Dias úteis</th>
                {colunas.map((c) => (
                  <th key={c.chave} style={{ textAlign: 'center' }}>
                    {c.nome}
                    {c.chave === 'zero' && (
                      <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                        em uso
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {simulacao.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.nome}</td>
                  <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{s.diasUteis}</td>
                  {s.reguas.length === 0 ? (
                    <td colSpan={colunas.length || 1} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      sem dias no período
                    </td>
                  ) : (
                    s.reguas.map((r) => (
                      <td key={r.chave} style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, color: r.bateu ? 'var(--success)' : 'var(--danger)' }}>
                          {r.nota}%
                        </span>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {r.bateu ? 'bateu' : 'não bateu'}
                        </span>
                      </td>
                    ))
                  )}
                </tr>
              ))}
              {simulacao.length === 0 && (
                <tr>
                  <td colSpan={2 + colunas.length} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                    Nenhum setor cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700 }}>
                <td colSpan={2}>Setores que bateriam a meta</td>
                {passamPorRegua.map((p) => (
                  <td key={p.nome} style={{ textAlign: 'center' }}>
                    {p.quantos} de {simulacao.length}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-title">O que cada régua faz</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {colunas.map((c) => (
            <div key={c.chave} style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: 12, alignItems: 'start' }}>
              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.nome}</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{c.descricao}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 16, marginBottom: 0 }}>
          Quanto mais tolerante a régua, menos um deslize pequeno derruba o time — e mais setores
          batem a meta, o que custa mais em prêmio. O desconto individual por peso acumulado
          continua valendo em qualquer uma delas.
        </p>
      </div>

      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 16 }}>
        Se decidir trocar a régua, a troca deve valer a partir de um mês escolhido — trocar sem
        recorte de data mudaria o resultado de meses já pagos.
      </p>
    </div>
  );
}
