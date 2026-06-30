import { isAdmin } from '@/actions/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import CadastroManager from '@/components/CadastroManager';
import {
  getColetores, criarColetor, atualizarColetor, alternarColetorAtivo, deletarColetor,
} from '@/actions/coletores';
import {
  getAtendentes, criarAtendente, atualizarAtendente, alternarAtendenteAtivo, deletarAtendente,
} from '@/actions/atendentes';
import {
  getClientes, criarCliente, atualizarCliente, alternarClienteAtivo, deletarCliente,
} from '@/actions/clientes';
import { temSenhaColetas, definirSenhaColetas } from '@/actions/coletasAcesso';

export const dynamic = 'force-dynamic';

export default async function CadastrosColetaPage() {
  const adminMode = await isAdmin();
  if (!adminMode) redirect('/admin/login');

  const [coletores, atendentes, clientes, protegida] = await Promise.all([
    getColetores(),
    getAtendentes(),
    getClientes(),
    temSenhaColetas(),
  ]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Cadastros de Coletas</h1>
          <nav className="breadcrumb">
            <Link href="/" className="breadcrumb-link">Mural</Link>
            <span className="breadcrumb-sep">›</span>
            <Link href="/coletas" className="breadcrumb-link">Coletas</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">Cadastros</span>
          </nav>
        </div>
        <Link href="/coletas" className="btn btn-secondary btn-sm">← Voltar para Coletas</Link>
      </div>

      {/* Senha de acesso às Coletas */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">
          Senha de acesso às Coletas
          <span className={`badge ${protegida ? 'badge-success' : 'badge-warning'}`} style={{ marginLeft: 8, fontSize: '0.7rem' }}>
            {protegida ? 'protegida' : 'aberta'}
          </span>
        </div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: -4, marginBottom: 12 }}>
          Define a senha que as atendentes usam para abrir a aba Coletas. Você (admin) entra sempre sem senha.
          Deixe o campo em branco e salve para <strong>remover</strong> a proteção.
        </p>
        <form action={definirSenhaColetas} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Nova senha</label>
            <input
              name="senha"
              type="text"
              className="form-input"
              placeholder={protegida ? '•••••• (já definida — digite para alterar)' : 'Defina uma senha'}
              autoComplete="off"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" style={{ height: 38 }}>Salvar senha</button>
        </form>
      </div>

      <CadastroManager
        titulo="Coletores"
        descricao="Quem faz as coletas. A cor identifica o coletor na tela do dia."
        campos={[
          { name: 'nome', label: 'Nome', obrigatorio: true, placeholder: 'Ex: Bruno' },
          { name: 'cor', label: 'Cor', tipo: 'color' },
        ]}
        itens={coletores}
        onCriar={criarColetor}
        onAtualizar={atualizarColetor}
        onAlternarAtivo={alternarColetorAtivo}
        onDeletar={deletarColetor}
      />

      <CadastroManager
        titulo="Atendentes"
        descricao="Quem inclui as coletas na lista do dia."
        campos={[{ name: 'nome', label: 'Nome', obrigatorio: true, placeholder: 'Ex: Mariane' }]}
        itens={atendentes}
        onCriar={criarAtendente}
        onAtualizar={atualizarAtendente}
        onAlternarAtivo={alternarAtendenteAtivo}
        onDeletar={deletarAtendente}
      />

      <CadastroManager
        titulo="Clientes / Empresas"
        descricao="Empresas onde são feitas as coletas, com o código."
        campos={[
          { name: 'nome', label: 'Nome da empresa', obrigatorio: true, largura: 2, placeholder: 'Ex: Pizzaia' },
          { name: 'codigo', label: 'Código', placeholder: 'Ex: 1215' },
        ]}
        itens={clientes}
        onCriar={criarCliente}
        onAtualizar={atualizarCliente}
        onAlternarAtivo={alternarClienteAtivo}
        onDeletar={deletarCliente}
      />
    </div>
  );
}
