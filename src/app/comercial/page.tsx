import Link from 'next/link';
import { buscarClientes } from '@/actions/clientes';
import { nivelComercial } from '@/actions/comercialAcesso';
import { portaoComercial } from './portao';

export const dynamic = 'force-dynamic';

export default async function ComercialPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const fechado = await portaoComercial();
  if (fechado) return fechado;

  const podeEditar = (await nivelComercial()) === 'editar';

  const sp = await searchParams;
  const termo = (sp.q ?? '').trim();
  const clientes = await buscarClientes(termo);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Comercial</h1>
          <nav className="breadcrumb">
            <Link href="/" className="breadcrumb-link">Mural</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">Comercial</span>
          </nav>
        </div>
        {podeEditar ? (
          <Link href="/comercial/novo" className="btn btn-primary btn-sm">+ Novo cliente</Link>
        ) : (
          /* Uma linha só, e só para quem entrou para consultar: sem ela, a
             pessoa abre a ficha, tenta digitar e não entende o porquê. */
          <span className="badge badge-info">Consulta — quem cadastra é o Comercial</span>
        )}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        {/* Formulário GET: a busca fica na URL, então dá para recarregar a
            página ou mandar o link para alguém sem perder o que foi digitado. */}
        <form method="get" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            type="search"
            name="q"
            className="form-input"
            defaultValue={termo}
            placeholder="Buscar por nome, CNPJ, código, telefone ou cidade"
            style={{ flex: '1 1 260px' }}
          />
          <button type="submit" className="btn btn-secondary">Buscar</button>
          {termo && <Link href="/comercial" className="btn btn-outline">Limpar</Link>}
        </form>
      </div>

      <div className="card">
        <div className="card-title">
          {termo ? `${clientes.length} resultado(s) para "${termo}"` : `Clientes (${clientes.length})`}
        </div>

        {clientes.length === 200 && (
          <p className="form-hint" style={{ marginBottom: 12 }}>
            Mostrando os 200 primeiros. Use a busca para achar um cliente específico.
          </p>
        )}

        {clientes.length === 0 ? (
          <p className="text-muted">
            {termo ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado ainda.'}
          </p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Código</th>
                  <th>CNPJ / CPF</th>
                  <th>Cidade</th>
                  <th>Telefone</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id} style={c.ativo ? undefined : { opacity: 0.55 }}>
                    <td>
                      <Link href={`/comercial/${c.id}`} style={{ fontWeight: 600 }}>
                        {c.nome}
                      </Link>
                      {c.nomeFantasia && (
                        <div className="text-muted" style={{ fontSize: 12 }}>{c.nomeFantasia}</div>
                      )}
                      {!c.ativo && <span className="badge badge-warning" style={{ marginLeft: 6 }}>Inativo</span>}
                    </td>
                    <td>{c.codigo || '—'}</td>
                    <td>{c.documento || '—'}</td>
                    <td>{c.cidade || '—'}</td>
                    <td>{c.telefone || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <Link href={`/comercial/${c.id}`} className="btn btn-outline btn-sm">Abrir</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
