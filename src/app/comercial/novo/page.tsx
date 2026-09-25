import Link from 'next/link';
import { podeUsarComercial, getSetorComercial } from '@/actions/comercialAcesso';
import PasswordPrompt from '@/components/PasswordPrompt';
import ClienteForm from '@/components/ClienteForm';

export const dynamic = 'force-dynamic';

export default async function NovoClientePage() {
  if (!(await podeUsarComercial())) {
    const setor = await getSetorComercial();
    if (!setor) {
      return (
        <div className="alert alert-info">
          A área Comercial ainda não foi ligada a um setor. Peça ao administrador
          para criar o setor Comercial.
        </div>
      );
    }
    return <PasswordPrompt setorId={setor.id} setorNome={setor.nome} />;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Novo cliente</h1>
          <nav className="breadcrumb">
            <Link href="/comercial" className="breadcrumb-link">Comercial</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">Novo cliente</span>
          </nav>
        </div>
      </div>

      <ClienteForm />
    </div>
  );
}
