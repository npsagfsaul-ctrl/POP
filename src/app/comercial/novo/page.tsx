import Link from 'next/link';
import ClienteForm from '@/components/ClienteForm';
import { portaoComercial } from '../portao';

export const dynamic = 'force-dynamic';

export default async function NovoClientePage() {
  const fechado = await portaoComercial();
  if (fechado) return fechado;

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
