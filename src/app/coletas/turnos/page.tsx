import { isAdmin } from '@/actions/admin';
import Link from 'next/link';
import { getTurnosPorData } from '@/actions/turnos';
import { coletasLiberado } from '@/actions/coletasAcesso';
import ColetasPasswordPrompt from '@/components/ColetasPasswordPrompt';
import { hojeISOSaoPaulo } from '@/lib/data';

export const dynamic = 'force-dynamic';

const hojeISO = hojeISOSaoPaulo;

function shiftData(dataStr: string, delta: number) {
  const [y, m, d] = dataStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function formatarData(dataStr: string) {
  const [y, m, d] = dataStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

function horaBR(d: Date) {
  return new Date(d).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  });
}

const CHECKLIST_LABEL: Record<string, string> = {
  oleoOk: 'Óleo', aguaOk: 'Água', pneusOk: 'Pneus', luzesOk: 'Luzes',
};

export default async function TurnosColetaPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
}) {
  const adminMode = await isAdmin();
  if (!adminMode && !(await coletasLiberado())) {
    return <ColetasPasswordPrompt />;
  }

  const sp = await searchParams;
  const dataStr = sp.data || hojeISO();
  const turnos = await getTurnosPorData(dataStr);

  const abertos = turnos.filter((t) => t.status === 'ABERTO').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Turnos dos Coletores</h1>
          <nav className="breadcrumb">
            <Link href="/" className="breadcrumb-link">Mural</Link>
            <span className="breadcrumb-sep">›</span>
            <Link href="/coletas" className="breadcrumb-link">Coletas</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">Turnos</span>
          </nav>
        </div>
        <Link href="/coletas" className="btn btn-secondary btn-sm">← Voltar para Coletas</Link>
      </div>

      {/* Navegação de data */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div style={{ textTransform: 'capitalize', fontWeight: 600, color: 'var(--text-main)' }}>
          {formatarData(dataStr)}
          {abertos > 0 && (
            <span className="badge badge-warning" style={{ marginLeft: 8, fontSize: '0.7rem' }}>{abertos} em andamento</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href={`/coletas/turnos?data=${shiftData(dataStr, -1)}`} className="btn btn-secondary btn-sm">← Dia anterior</Link>
          <Link href={`/coletas/turnos?data=${shiftData(dataStr, 1)}`} className="btn btn-secondary btn-sm">Próximo dia →</Link>
        </div>
      </div>

      {turnos.length === 0 ? (
        <div className="alert alert-info">Nenhum turno registrado em {formatarData(dataStr)}.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {turnos.map((t) => {
            const checklistProblemas = (['oleoOk', 'aguaOk', 'pneusOk', 'luzesOk'] as const).filter(
              (k) => !t[k],
            );
            return (
              <div key={t.id} className="card" style={{ borderLeft: `4px solid ${t.coletor.cor}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                  <div>
                    <span style={{ fontWeight: 700, color: t.coletor.cor }}>{t.coletor.nome}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}> · {t.veiculo.nome}{t.veiculo.placa ? ` (${t.veiculo.placa})` : ''}</span>
                  </div>
                  <span className={`badge ${t.status === 'ABERTO' ? 'badge-warning' : t.encerradoAutomaticamente ? 'badge-danger' : 'badge-success'}`} style={{ fontSize: '0.7rem' }}>
                    {t.status === 'ABERTO'
                      ? 'Em andamento'
                      : t.encerradoAutomaticamente
                        ? 'Não encerrado pelo coletor'
                        : 'Encerrado'}
                  </span>
                </div>

                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                  KM {t.kmInicial}
                  {t.kmFinal != null
                    ? ` → ${t.kmFinal} (${t.kmFinal - t.kmInicial} km rodados)`
                    : t.encerradoAutomaticamente
                      ? ' → sem KM final (o coletor não encerrou o dia)'
                      : ' (ainda não encerrado)'}
                  {' · '}Combustível na saída: {t.combustivelInicial}
                  {' · '}liberado às {horaBR(t.liberadoEm)}
                  {t.encerradoEm && ` · encerrado às ${horaBR(t.encerradoEm)}`}
                </div>

                {(checklistProblemas.length > 0 || t.observacaoInicial) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                    {checklistProblemas.map((k) => (
                      <span key={k} className="badge badge-danger" style={{ fontSize: '0.7rem' }}>
                        {CHECKLIST_LABEL[k]}: problema
                      </span>
                    ))}
                    {t.observacaoInicial && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Obs. saída: {t.observacaoInicial}</span>
                    )}
                  </div>
                )}

                {(t.abastecimentoValor != null || t.problemaCarro) && (
                  <div style={{ fontSize: '0.8125rem', borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 6 }}>
                    {t.abastecimentoValor != null && (
                      <div>⛽ Abastecimento: R$ {t.abastecimentoValor.toFixed(2)}{t.abastecimentoNota ? ` — ${t.abastecimentoNota}` : ''}</div>
                    )}
                    {t.problemaCarro && (
                      <div style={{ color: 'var(--danger)' }}>⚠ Problema relatado: {t.problemaCarro}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
