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

export const dynamic = 'force-dynamic';

export default async function CadastrosColetaPage() {
  const adminMode = await isAdmin();
  if (!adminMode) redirect('/admin/login');

  const [coletores, atendentes, clientes] = await Promise.all([
    getColetores(),
    getAtendentes(),
    getClientes(),
  ]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Cadastros de Coletas</h1>
          <nav className="breadcrumb">
            <Link href="/" className="breadcrumb-link">Mural</Link>
            <span className="breadcrumb-sep">›</span>
            <Link href="/admin/coletas" className="breadcrumb-link">Coletas</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">Cadastros</span>
          </nav>
        </div>
        <Link href="/admin/coletas" className="btn btn-secondary btn-sm">← Voltar para Coletas</Link>
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
