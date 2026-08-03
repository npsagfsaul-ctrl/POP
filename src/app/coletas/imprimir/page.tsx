import { isAdmin } from '@/actions/admin';
import Link from 'next/link';
import { getColetasPorData } from '@/actions/coletas';
import { coletasLiberado } from '@/actions/coletasAcesso';
import ColetasPasswordPrompt from '@/components/ColetasPasswordPrompt';
import PrintButton from '@/components/PrintButton';
import { hojeISOSaoPaulo } from '@/lib/data';
import { CORTE_PEDIDOS } from '@/lib/coletasStatus';

export const dynamic = 'force-dynamic';

const hojeISO = hojeISOSaoPaulo;

/** Linhas em branco por período, para as extras que chegarem depois da impressão. */
const LINHAS_EM_BRANCO = 8;

function formatarData(dataStr: string) {
  const [y, m, d] = dataStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

const PERIODOS: { key: 'MANHA' | 'TARDE' | 'RETORNO'; label: string }[] = [
  { key: 'MANHA', label: 'Manhã' },
  { key: 'TARDE', label: 'Tarde' },
  { key: 'RETORNO', label: 'Retorno' },
];

export default async function ImprimirColetasPage({
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
  // Canceladas ficam fora da folha do coletor — ele não deve passar lá.
  const coletas = (await getColetasPorData(dataStr)).filter((c) => c.status !== 'CANCELADO');

  // Agrupa por coletor
  const grupos = new Map<string, { nome: string; cor: string; itens: typeof coletas }>();
  for (const c of coletas) {
    const g = grupos.get(c.coletorId) ?? { nome: c.coletor.nome, cor: c.coletor.cor, itens: [] };
    g.itens.push(c);
    grupos.set(c.coletorId, g);
  }
  const coletores = [...grupos.values()].sort((a, b) => a.nome.localeCompare(b.nome));
  const dataFmt = formatarData(dataStr);

  // A folha sai antes do horário de corte, então o coletor precisa saber
  // até quando ela está atualizada — o que vier depois chega pelo celular.
  const horaImpressao = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  });

  const linhasVazias = Array.from({ length: LINHAS_EM_BRANCO });

  return (
    <div className="coletas-print">
      {/* Barra de ações (não imprime) */}
      <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <Link href={`/coletas?data=${dataStr}`} className="btn btn-secondary btn-sm">← Voltar</Link>
        <PrintButton />
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Cada coletor sai em uma página separada, com espaço para anotar as extras que chegarem depois.
        </span>
      </div>

      {coletores.length === 0 ? (
        <div className="card"><p>Nenhuma coleta registrada para {dataFmt}.</p></div>
      ) : (
        coletores.map((col) => (
          <div key={col.nome} className="print-page" style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #111', paddingBottom: 8, marginBottom: 14 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#111' }}>{col.nome}</h2>
                <div style={{ fontSize: '0.85rem', color: '#555', textTransform: 'capitalize' }}>{dataFmt}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.78rem', color: '#555' }}>Impressa às <strong>{horaImpressao}</strong></div>
                <span style={{ display: 'inline-block', marginTop: 4, width: 22, height: 22, borderRadius: 5, background: col.cor, border: '1px solid #999' }} />
              </div>
            </div>

            {PERIODOS.map((p) => {
              const doPeriodo = col.itens.filter((c) => c.periodo === p.key);
              if (doPeriodo.length === 0) return null;
              const fixas = doPeriodo.filter((c) => c.tipo === 'FIXA');
              const extras = doPeriodo.filter((c) => c.tipo !== 'FIXA');
              const corte = CORTE_PEDIDOS[p.key];

              return (
                <div key={p.key} style={{ marginBottom: 16 }}>
                  <h3 style={{ margin: '0 0 6px', fontSize: '1rem', color: '#111' }}>
                    {p.label}
                    {corte && (
                      <span style={{ fontWeight: 400, fontSize: '0.8rem', color: '#666' }}>
                        {' '}— pedidos até {corte}
                      </span>
                    )}
                  </h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, width: 26 }}>✓</th>
                        <th style={{ ...thStyle, width: 50 }}>Cód</th>
                        <th style={{ ...thStyle, textAlign: 'left' }}>Cliente / endereço</th>
                        <th style={{ ...thStyle, textAlign: 'left', width: '32%' }}>Anotações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fixas.map((c) => (
                        <tr key={c.id}>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>☐</td>
                          <td style={{ ...tdStyle, textAlign: 'center', color: '#555' }}>{c.cliente.codigo || ''}</td>
                          <td style={tdStyle}>
                            <strong>{c.cliente.nome}</strong>
                            {c.observacao && <span style={{ color: '#444' }}> — {c.observacao}</span>}
                            {c.naoTeveColeta && <span style={{ color: '#b91c1c' }}> — não teve coleta</span>}
                          </td>
                          <td style={tdStyle} />
                        </tr>
                      ))}

                      {/* Extras já lançadas + espaço para as que chegarem depois */}
                      <tr>
                        <td colSpan={4} style={{ ...tdStyle, background: '#f1f1f1', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: '#333', borderBottom: '1px solid #999' }}>
                          EXTRAS
                        </td>
                      </tr>
                      {extras.map((c) => (
                        <tr key={c.id}>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>☐</td>
                          <td style={{ ...tdStyle, textAlign: 'center', color: '#555' }}>{c.cliente.codigo || ''}</td>
                          <td style={tdStyle}>
                            <strong>{c.cliente.nome}</strong>
                            {c.observacao && <span style={{ color: '#444' }}> — {c.observacao}</span>}
                            {c.naoTeveColeta && <span style={{ color: '#b91c1c' }}> — não teve coleta</span>}
                          </td>
                          <td style={tdStyle} />
                        </tr>
                      ))}
                      {linhasVazias.map((_, i) => (
                        <tr key={`vazia-${i}`}>
                          <td style={{ ...tdStyle, textAlign: 'center', color: '#bbb' }}>☐</td>
                          <td style={tdStyle} />
                          <td style={tdStyle} />
                          <td style={tdStyle} />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}

            <div style={{ fontSize: '0.75rem', color: '#777', marginTop: 8, borderTop: '1px solid #ddd', paddingTop: 6 }}>
              {col.itens.length} coleta(s) impressa(s). O que for pedido depois das {horaImpressao} chega
              pelo celular, em Coletas → Sou coletor.
            </div>
          </div>
        ))
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  borderBottom: '1px solid #999',
  padding: '4px 6px',
  textAlign: 'center',
  color: '#111',
  fontSize: '0.78rem',
};

const tdStyle: React.CSSProperties = {
  borderBottom: '1px solid #ddd',
  padding: '6px 6px',
  color: '#111',
  verticalAlign: 'top',
  height: 26,
};
