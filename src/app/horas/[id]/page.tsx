import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isAdmin } from '@/actions/admin';
import { getColaboradorComHoras } from '@/actions/horas';
import ControleHorasColaborador from '@/components/ControleHorasColaborador';

export const dynamic = 'force-dynamic';

export default async function ColaboradorHorasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdmin())) {
    return (
      <div className="alert alert-info">
        O controle de horas é do Departamento Pessoal.{' '}
        <Link href="/admin/login" style={{ textDecoration: 'underline' }}>Entre como Administrador</Link>.
      </div>
    );
  }

  const { id } = await params;
  const colaborador = await getColaboradorComHoras(id);
  if (!colaborador) notFound();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{colaborador.nome}</h1>
          <nav className="breadcrumb">
            <Link href="/horas" className="breadcrumb-link">Controle de Horas</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">
              {colaborador.jornada || colaborador.setorNome || colaborador.nome}
            </span>
          </nav>
        </div>
        <Link href="/horas" className="btn btn-secondary btn-sm">← Voltar</Link>
      </div>

      <ControleHorasColaborador c={colaborador} />
    </div>
  );
}
