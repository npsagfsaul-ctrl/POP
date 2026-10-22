import Link from 'next/link';
import ClienteForm from '@/components/ClienteForm';
import { nivelComercial } from '@/actions/comercialAcesso';
import { portaoComercial } from '../portao';

export const dynamic = 'force-dynamic';

export default async function NovoClientePage() {
  /**
   * A porta também pode estourar, e é a última do Comercial sem tratamento.
   *
   * Depois de salvar, o Next re-renderiza esta página para devolver a resposta
   * da ação — então um erro AQUI aparece como se fosse do cadastro, com o
   * mesmo parágrafo genérico em inglês. Escrito, dá para distinguir.
   */
  let fechado: React.ReactNode;
  try {
    fechado = await portaoComercial();
  } catch (e) {
    return (
      <div className="alert alert-danger">
        <strong>Não foi possível abrir o cadastro.</strong>
        <p style={{ margin: '8px 0 0' }}>{e instanceof Error ? e.message : 'Erro desconhecido.'}</p>
      </div>
    );
  }
  if (fechado) return fechado;

  if ((await nivelComercial()) !== 'editar') {
    return (
      <div className="alert alert-info">
        Quem cadastra cliente é o setor Comercial. Você entrou para consultar —{' '}
        <Link href="/comercial" style={{ textDecoration: 'underline' }}>volte para a lista</Link>.
      </div>
    );
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
