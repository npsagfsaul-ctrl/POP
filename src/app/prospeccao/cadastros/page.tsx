import Link from 'next/link';
import CadastroManager from '@/components/CadastroManager';
import {
  getAtendentes, criarAtendente, atualizarAtendente, alternarAtendenteAtivo, deletarAtendente,
} from '@/actions/atendentes';
import { getSetores } from '@/actions/setores';

export const dynamic = 'force-dynamic';

export default async function CadastrosProspeccaoPage() {
  const [atendentes, setores] = await Promise.all([getAtendentes(), getSetores()]);
  const opcoesSetor = setores.map((s) => ({ value: s.id, label: s.nome }));

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
        descricao="Cadastro único, usado também nas Coletas e no checklist dos setores. O setor define em qual checklist a pessoa aparece como possível responsável — deixe em branco para quem circula por vários."
        campos={[
          { name: 'nome', label: 'Nome', obrigatorio: true, placeholder: 'Ex: Allana', largura: 2 },
          { name: 'setorId', label: 'Setor', tipo: 'select', opcoes: opcoesSetor, vazioLabel: 'Todos os setores' },
        ]}
        itens={atendentes}
        onCriar={criarAtendente}
        onAtualizar={atualizarAtendente}
        onAlternarAtivo={alternarAtendenteAtivo}
        onDeletar={deletarAtendente}
      />
    </div>
  );
}
