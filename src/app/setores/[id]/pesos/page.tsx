import { isAdmin } from '@/actions/admin';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getPopsBySetor } from '@/actions/pops';
import { ordenarPops } from '@/lib/pops';
import RevisarPesos from '@/components/RevisarPesos';

export const dynamic = 'force-dynamic';

export default async function RevisarPesosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Mexer em peso muda a nota de todo mundo — fica com o admin.
  if (!(await isAdmin())) redirect('/admin/login');

  const { id } = await params;
  const setor = await prisma.setor.findUnique({ where: { id } });
  if (!setor) notFound();

  // Inclui desativados: eles ainda contam nos dias em que valiam.
  const pops = ordenarPops(await getPopsBySetor(id, true));

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="page-header">
        <div>
          <nav className="breadcrumb" style={{ marginBottom: 4 }}>
            <Link href="/setores" className="breadcrumb-link">Setores</Link>
            <span className="breadcrumb-sep">›</span>
            <Link href={`/setores/${setor.id}`} className="breadcrumb-link">{setor.nome}</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">Revisar pesos</span>
          </nav>
          <h1 className="page-title">Revisar pesos — {setor.nome}</h1>
        </div>
        <Link href={`/setores/${setor.id}`} className="btn btn-secondary btn-sm">← Voltar</Link>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 16 }}>
        Alterar o peso muda a conta dos <strong>dias já fechados</strong> deste setor, porque a nota de
        cada dia é calculada com o peso atual dos POPs. Se for fazer uma revisão grande, o melhor
        momento é no começo do mês.
      </div>

      <RevisarPesos
        setorId={setor.id}
        pops={pops.map((p) => ({
          id: p.id,
          titulo: p.titulo,
          peso: p.peso,
          desativado: p.desativadoEm !== null,
        }))}
      />
    </div>
  );
}
