import { isAdmin } from '@/actions/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getColetasPorData } from '@/actions/coletas';
import { getColetores } from '@/actions/coletores';
import { getAtendentes } from '@/actions/atendentes';
import { getClientes } from '@/actions/clientes';
import ColetasDoDia from '@/components/ColetasDoDia';

export const dynamic = 'force-dynamic';

function hojeISO() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export default async function ColetasPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
}) {
  const adminMode = await isAdmin();
  if (!adminMode) redirect('/admin/login');

  const sp = await searchParams;
  const dataStr = sp.data || hojeISO();

  const [coletas, coletores, atendentes, clientes] = await Promise.all([
    getColetasPorData(dataStr),
    getColetores(true),
    getAtendentes(true),
    getClientes(true),
  ]);

  const coletasView = coletas.map((c) => ({
    id: c.id,
    periodo: c.periodo,
    tipo: c.tipo,
    observacao: c.observacao,
    naoTeveColeta: c.naoTeveColeta,
    coletorId: c.coletorId,
    clienteId: c.clienteId,
    atendenteId: c.atendenteId,
    coletorNome: c.coletor.nome,
    coletorCor: c.coletor.cor,
    clienteNome: c.cliente.nome,
    clienteCodigo: c.cliente.codigo,
    atendenteNome: c.atendente?.nome ?? null,
  }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Coletas do Dia</h1>
          <nav className="breadcrumb">
            <Link href="/" className="breadcrumb-link">Mural</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">Coletas</span>
          </nav>
        </div>
        <Link href="/admin/coletas/cadastros" className="btn btn-secondary btn-sm">⚙ Cadastros</Link>
      </div>

      {(coletores.length === 0 || clientes.length === 0) && (
        <div className="alert alert-info" style={{ marginBottom: 16 }}>
          Antes de lançar coletas, cadastre os{' '}
          <Link href="/admin/coletas/cadastros" style={{ textDecoration: 'underline' }}>coletores e clientes</Link>.
        </div>
      )}

      <ColetasDoDia
        data={dataStr}
        coletas={coletasView}
        coletores={coletores.map((c) => ({ id: c.id, nome: c.nome, cor: c.cor }))}
        atendentes={atendentes.map((a) => ({ id: a.id, nome: a.nome }))}
        clientes={clientes.map((c) => ({ id: c.id, nome: c.nome, codigo: c.codigo }))}
      />
    </div>
  );
}
