import { isAdmin } from '@/actions/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getDiasSemExpedienteDetalhado, getExpedienteValeDe } from '@/actions/expediente';
import { hojeISOSaoPaulo } from '@/lib/data';
import GerenciarExpediente from '@/components/admin/GerenciarExpediente';

export const dynamic = 'force-dynamic';

export default async function ExpedientePage() {
  if (!(await isAdmin())) redirect('/admin/login');

  const [dias, setores, valeDe] = await Promise.all([
    getDiasSemExpedienteDetalhado(),
    prisma.setor.findMany({
      select: { id: true, nome: true, diasExpediente: true },
      orderBy: { nome: 'asc' },
    }),
    getExpedienteValeDe(),
  ]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Expediente</h1>
          <nav className="breadcrumb">
            <Link href="/" className="breadcrumb-link">Mural</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">Expediente</span>
          </nav>
        </div>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 16 }}>
        Até agora a nota tinha uma regra só: <strong>não é domingo, então conta</strong>.
        Com isso, os setores que não abrem aos sábados eram medidos sobre 4 sábados e os
        feriados de cada mês — dias em que a porta estava fechada. Aqui você diz quais dias
        realmente existem.
      </div>

      <GerenciarExpediente
        dias={dias.map((d) => ({
          id: d.id,
          data: new Date(d.data).toISOString().slice(0, 10),
          descricao: d.descricao,
        }))}
        setores={setores}
        valeDe={valeDe}
        hojeISO={hojeISOSaoPaulo()}
      />
    </div>
  );
}
