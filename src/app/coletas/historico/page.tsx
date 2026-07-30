import { isAdmin } from '@/actions/admin';
import Link from 'next/link';
import { getColetasMensais } from '@/actions/coletas';
import { coletasLiberado } from '@/actions/coletasAcesso';
import ColetasPasswordPrompt from '@/components/ColetasPasswordPrompt';
import { STATUS_COLETA_LABEL, StatusColetaTexto } from '@/lib/coletasStatus';

export const dynamic = 'force-dynamic';

const PERIODO_LABEL: Record<string, string> = { MANHA: 'Manhã', TARDE: 'Tarde', RETORNO: 'Retorno' };
const STATUS_BADGE: Record<StatusColetaTexto, string> = {
  AGUARDANDO: 'badge-warning',
  COLETADO: 'badge-success',
  CANCELADO: 'badge-danger',
};

const NOME_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default async function HistoricoColetasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ano?: string }>;
}) {
  const adminMode = await isAdmin();
  if (!adminMode && !(await coletasLiberado())) {
    return <ColetasPasswordPrompt />;
  }

  const sp = await searchParams;
  const hoje = new Date();
  const mes = sp.mes ? parseInt(sp.mes, 10) : hoje.getMonth() + 1;
  const ano = sp.ano ? parseInt(sp.ano, 10) : hoje.getFullYear();

  const coletas = await getColetasMensais(mes, ano);

  const contagem = { total: coletas.length, coletadas: 0, aguardando: 0, canceladas: 0, fixas: 0, extras: 0 };
  coletas.forEach((c) => {
    if (c.status === 'COLETADO') contagem.coletadas++;
    else if (c.status === 'CANCELADO') contagem.canceladas++;
    else contagem.aguardando++;
    if (c.tipo === 'FIXA') contagem.fixas++;
    else contagem.extras++;
  });

  const prevMes = mes === 1 ? 12 : mes - 1;
  const prevAno = mes === 1 ? ano - 1 : ano;
  const nextMes = mes === 12 ? 1 : mes + 1;
  const nextAno = mes === 12 ? ano + 1 : ano;

  const dataBR = (d: Date) => {
    const dt = new Date(d);
    return `${String(dt.getUTCDate()).padStart(2, '0')}/${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Histórico de Coletas</h1>
          <nav className="breadcrumb">
            <Link href="/" className="breadcrumb-link">Mural</Link>
            <span className="breadcrumb-sep">›</span>
            <Link href="/coletas" className="breadcrumb-link">Coletas</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">Histórico</span>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <a href={`/api/coletas/export?tipo=coletas&mes=${mes}&ano=${ano}`} className="btn btn-secondary btn-sm">
            ⬇ Excel do mês
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '4px' }}>
            <Link
              href={`/coletas/historico?mes=${prevMes}&ano=${prevAno}`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)' }}
            >
              ‹
            </Link>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', padding: '0 8px' }}>
              {NOME_MESES[mes - 1]} de {ano}
            </span>
            <Link
              href={`/coletas/historico?mes=${nextMes}&ano=${nextAno}`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)' }}
            >
              ›
            </Link>
          </div>
        </div>
      </div>

      {/* Resumo do mês */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Total', valor: contagem.total, cor: 'var(--text-main)' },
          { label: 'Coletadas', valor: contagem.coletadas, cor: 'var(--success)' },
          { label: 'Aguardando', valor: contagem.aguardando, cor: 'var(--warning)' },
          { label: 'Canceladas', valor: contagem.canceladas, cor: 'var(--danger)' },
          { label: 'Fixas', valor: contagem.fixas, cor: 'var(--primary)' },
          { label: 'Extras', valor: contagem.extras, cor: 'var(--primary)' },
        ].map((s) => (
          <div key={s.label} className="stat-card" style={{ padding: '12px 14px' }}>
            <div className="stat-label" style={{ fontSize: '0.7rem' }}>{s.label}</div>
            <div className="stat-value" style={{ fontSize: '1.3rem', color: s.cor }}>{s.valor}</div>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Período</th>
                <th>Tipo</th>
                <th>Coletor</th>
                <th>Cliente</th>
                <th>Funcionário</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {coletas.map((c) => (
                <tr key={c.id}>
                  <td>{dataBR(c.data)}</td>
                  <td>{PERIODO_LABEL[c.periodo] ?? c.periodo}</td>
                  <td>
                    <span className={`badge ${c.tipo === 'FIXA' ? 'badge-info' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                      {c.tipo === 'FIXA' ? 'Fixa' : 'Extra'}
                    </span>
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: c.coletor.cor, display: 'inline-block' }} />
                      {c.coletor.nome}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {c.cliente.nome}
                    {c.cliente.codigo && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> ({c.cliente.codigo})</span>}
                  </td>
                  <td>{c.atendente?.nome ?? '—'}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[c.status as StatusColetaTexto]}`} style={{ fontSize: '0.7rem' }}>
                      {STATUS_COLETA_LABEL[c.status as StatusColetaTexto]}
                    </span>
                  </td>
                </tr>
              ))}
              {coletas.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                    Nenhuma coleta registrada em {NOME_MESES[mes - 1]} de {ano}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
