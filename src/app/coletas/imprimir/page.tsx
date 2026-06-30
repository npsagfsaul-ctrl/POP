import { isAdmin } from '@/actions/admin';
import Link from 'next/link';
import { getColetasPorData } from '@/actions/coletas';
import { coletasLiberado } from '@/actions/coletasAcesso';
import ColetasPasswordPrompt from '@/components/ColetasPasswordPrompt';
import PrintButton from '@/components/PrintButton';

export const dynamic = 'force-dynamic';

function hojeISO() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

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
  const coletas = await getColetasPorData(dataStr);

  // Agrupa por coletor
  const grupos = new Map<string, { nome: string; cor: string; itens: typeof coletas }>();
  for (const c of coletas) {
    const g = grupos.get(c.coletorId) ?? { nome: c.coletor.nome, cor: c.coletor.cor, itens: [] };
    g.itens.push(c);
    grupos.set(c.coletorId, g);
  }
  const coletores = [...grupos.values()].sort((a, b) => a.nome.localeCompare(b.nome));
  const dataFmt = formatarData(dataStr);

  return (
    <div className="coletas-print">
      {/* Barra de ações (não imprime) */}
      <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <Link href={`/coletas?data=${dataStr}`} className="btn btn-secondary btn-sm">← Voltar</Link>
        <PrintButton />
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Cada coletor sai em uma página separada.
        </span>
      </div>

      {coletores.length === 0 ? (
        <div className="card"><p>Nenhuma coleta registrada para {dataFmt}.</p></div>
      ) : (
        coletores.map((col) => (
          <div key={col.nome} className="print-page" style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #111', paddingBottom: 8, marginBottom: 14 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#111' }}>Rota — {col.nome}</h2>
                <div style={{ fontSize: '0.85rem', color: '#555', textTransform: 'capitalize' }}>{dataFmt}</div>
              </div>
              <span style={{ width: 22, height: 22, borderRadius: 5, background: col.cor, border: '1px solid #999' }} />
            </div>

            {PERIODOS.map((p) => {
              const itens = col.itens.filter((c) => c.periodo === p.key);
              if (itens.length === 0) return null;
              return (
                <div key={p.key} style={{ marginBottom: 14 }}>
                  <h3 style={{ margin: '0 0 6px', fontSize: '1rem', color: '#111' }}>{p.label}</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>✓</th>
                        <th style={{ ...thStyle, textAlign: 'left' }}>Empresa</th>
                        <th style={{ ...thStyle, textAlign: 'left' }}>Observação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itens.map((c) => (
                        <tr key={c.id}>
                          <td style={{ ...tdStyle, textAlign: 'center', width: 28 }}>☐</td>
                          <td style={tdStyle}>
                            <strong>{c.cliente.nome}</strong>
                            {c.cliente.codigo && <span style={{ color: '#555' }}> ({c.cliente.codigo})</span>}
                            {c.naoTeveColeta && <span style={{ color: '#b91c1c' }}> — não teve coleta</span>}
                          </td>
                          <td style={{ ...tdStyle, color: '#333' }}>{c.observacao || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}

            <div style={{ fontSize: '0.75rem', color: '#777', marginTop: 8 }}>
              Total de coletas: {col.itens.length}
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
  padding: '5px 6px',
  color: '#111',
  verticalAlign: 'top',
};
