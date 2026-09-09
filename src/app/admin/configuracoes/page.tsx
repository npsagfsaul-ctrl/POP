import { isAdmin } from '@/actions/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getDiasSemExpedienteDetalhado } from '@/actions/expediente';
import { formatarDiasExpediente } from '@/lib/expediente';
import DiasSemExpediente from '@/components/admin/DiasSemExpediente';

export const dynamic = 'force-dynamic';

export default async function ConfiguracoesPage() {
  if (!(await isAdmin())) redirect('/admin/login');

  const [dias, setores] = await Promise.all([
    getDiasSemExpedienteDetalhado(),
    prisma.setor.findMany({
      select: { id: true, nome: true, diasExpediente: true },
      orderBy: { nome: 'asc' },
    }),
  ]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Configurações</h1>
          <nav className="breadcrumb">
            <Link href="/" className="breadcrumb-link">Mural</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">Configurações</span>
          </nav>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Dias em que a agência não abriu</div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 14 }}>
          Feriado nacional o sistema já conhece sozinho. Aqui entra só o que ele não tem
          como saber: feriado municipal em que vocês fecharam, falta de energia, e afins.
          Esses dias saem da conta de todos os setores.
        </p>
        <DiasSemExpediente dias={dias} />
      </div>

      <div className="card">
        <div className="card-title">Dias de expediente dos setores</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {setores.map((s, i) => (
            <div
              key={s.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 12, flexWrap: 'wrap', padding: '9px 0',
                borderTop: i === 0 ? 'none' : '1px solid var(--border)',
              }}
            >
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{s.nome}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="badge badge-info">{formatarDiasExpediente(s.diasExpediente)}</span>
                <Link href={`/setores/${s.id}/editar`} className="btn btn-secondary btn-sm">Editar</Link>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
