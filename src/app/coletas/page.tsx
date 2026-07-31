import { isAdmin } from '@/actions/admin';
import Link from 'next/link';
import { getColetasPorData } from '@/actions/coletas';
import { getColetores } from '@/actions/coletores';
import { getAtendentes } from '@/actions/atendentes';
import { getClientes } from '@/actions/clientes';
import { coletasLiberado } from '@/actions/coletasAcesso';
import ColetasDoDia from '@/components/ColetasDoDia';
import ColetasPasswordPrompt from '@/components/ColetasPasswordPrompt';

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

  // Proteção por senha (admin entra direto)
  if (!adminMode && !(await coletasLiberado())) {
    return <ColetasPasswordPrompt />;
  }

  const sp = await searchParams;
  const dataStr = sp.data || hojeISO();

  const [coletas, coletores, atendentes, clientes] = await Promise.all([
    getColetasPorData(dataStr),
    getColetores(true),
    getAtendentes(true),
    getClientes(true),
  ]);

  const horaBR = (d: Date) =>
    new Date(d).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    });

  const coletasView = coletas.map((c) => ({
    id: c.id,
    periodo: c.periodo,
    tipo: c.tipo,
    status: c.status,
    horaColeta: c.horaColeta ? horaBR(c.horaColeta) : null,
    criadaEm: horaBR(c.createdAt),
    rotaNome: c.rotaFixa?.rota?.nome ?? null,
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
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/coletas/motorista" className="btn btn-secondary btn-sm">
            🚚 Sou coletor
          </Link>
          <Link href="/coletas/turnos" className="btn btn-secondary btn-sm">
            🧾 Turnos
          </Link>
          <Link href="/coletas/historico" className="btn btn-secondary btn-sm">
            📊 Histórico
          </Link>
          <Link href={`/coletas/imprimir?data=${dataStr}`} className="btn btn-secondary btn-sm">
            🖨 Imprimir rotas
          </Link>
          {adminMode && (
            <Link href="/coletas/cadastros" className="btn btn-secondary btn-sm">⚙ Cadastros</Link>
          )}
        </div>
      </div>

      {(coletores.length === 0 || clientes.length === 0) && (
        <div className="alert alert-info" style={{ marginBottom: 16 }}>
          {adminMode ? (
            <>Antes de lançar coletas, cadastre os{' '}
              <Link href="/coletas/cadastros" style={{ textDecoration: 'underline' }}>coletores e clientes</Link>.</>
          ) : (
            <>Os coletores e clientes ainda não foram cadastrados. Peça ao administrador para configurar.</>
          )}
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
