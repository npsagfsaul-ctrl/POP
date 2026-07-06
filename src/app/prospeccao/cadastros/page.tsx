import { isAdmin } from '@/actions/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import CadastroManager from '@/components/CadastroManager';
import {
  getAtendentes, criarAtendente, atualizarAtendente, alternarAtendenteAtivo, deletarAtendente,
} from '@/actions/atendentes';

export const dynamic = 'force-dynamic';

export default async function CadastrosProspeccaoPage() {
  const adminMode = await isAdmin();
  if (!adminMode) redirect('/admin/login');

  const atendentes = await getAtendentes();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Cadastro de Funcionários</h1>
          <nav className="breadcrumb">
            <Link href="/" className="breadcrumb-link">Mural</Link>
            <span className="breadcrumb-sep">›</span>
            <Link href="/prospeccao" className="breadcrumb-link">Prospecção</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">Cadastros</span>
          </nav>
        </div>
        <Link href="/prospeccao" className="btn btn-secondary btn-sm">← Voltar para Prospecção</Link>
      </div>

      <CadastroManager
        titulo="Funcionários"
        descricao="Quem faz a prospecção de clientes. Este cadastro é o mesmo usado nas Coletas."
        campos={[{ name: 'nome', label: 'Nome', obrigatorio: true, placeholder: 'Ex: Allana' }]}
        itens={atendentes}
        onCriar={criarAtendente}
        onAtualizar={atualizarAtendente}
        onAlternarAtivo={alternarAtendenteAtivo}
        onDeletar={deletarAtendente}
      />
    </div>
  );
}
