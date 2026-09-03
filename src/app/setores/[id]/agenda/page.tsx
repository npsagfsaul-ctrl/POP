import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { isAdmin } from '@/actions/admin';
import { prisma } from '@/lib/prisma';
import { getAgendaDoSetor } from '@/actions/agenda';
import { podeEscreverNoSetor } from '@/actions/setorAcesso';
import { hojeISOSaoPaulo } from '@/lib/data';
import PasswordPrompt from '@/components/PasswordPrompt';
import AgendaSetor from '@/components/AgendaSetor';

export const dynamic = 'force-dynamic';

export default async function AgendaDoSetorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mes?: string; ano?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const adminMode = await isAdmin();

  const setor = await prisma.setor.findUnique({ where: { id } });
  if (!setor) notFound();

  if (setor.senha) {
    const cookieStore = await cookies();
    if (!cookieStore.get(`auth_setor_${setor.id}`) && !adminMode) {
      return <PasswordPrompt setorId={setor.id} setorNome={setor.nome} />;
    }
  }

  const hoje = hojeISOSaoPaulo();
  const [anoHoje, mesHoje] = hoje.split('-').map(Number);
  const mes = sp.mes ? Math.min(12, Math.max(1, parseInt(sp.mes))) : mesHoje;
  const ano = sp.ano ? parseInt(sp.ano) : anoHoje;

  const itens = await getAgendaDoSetor(id);
  const podeEditar = await podeEscreverNoSetor(id);

  return (
    <div>
      <div className="page-header">
        <div>
          <nav className="breadcrumb" style={{ marginBottom: 4 }}>
            <Link href="/setores" className="breadcrumb-link">Setores</Link>
            <span className="breadcrumb-sep">›</span>
            <Link href={`/setores/${setor.id}`} className="breadcrumb-link">{setor.nome}</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">Agenda</span>
          </nav>
          <h1 className="page-title">Agenda — {setor.nome}</h1>
        </div>
        <Link href={`/setores/${setor.id}`} className="btn btn-secondary btn-sm">← Voltar ao painel</Link>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 16 }}>
        Esta agenda é do setor, para não deixar passar o que tem data marcada.{' '}
        <strong>Ela não entra na conta dos 80%</strong> — a nota do POP mede os dias do
        checklist, e um processo que acontece a cada quatro meses não é um dia, é um prazo.
        Aqui o que cobra é o atraso ficar à vista.
      </div>

      {!podeEditar && (
        <div className="alert alert-warning" style={{ marginBottom: 16 }}>
          Você está só olhando. Para marcar processos como feitos é preciso entrar com a senha
          deste setor.
        </div>
      )}

      <AgendaSetor
        setorId={setor.id}
        itens={itens}
        mes={mes}
        ano={ano}
        hojeISO={hoje}
        podeEditar={podeEditar}
      />
    </div>
  );
}
