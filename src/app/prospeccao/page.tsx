import Link from 'next/link';
import { getSetores } from '@/actions/setores';
import { getAtendentes } from '@/actions/atendentes';
import { getProspeccoes, getMesesDeProspeccao, FiltrosProspeccao } from '@/actions/prospeccao';
import { podeEditarComercial } from '@/actions/comercialAcesso';
import { hojeISOSaoPaulo } from '@/lib/data';
import ProspeccaoManager from '@/components/ProspeccaoManager';

export const dynamic = 'force-dynamic';

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default async function ProspeccaoPage({
  searchParams,
}: {
  searchParams: Promise<{
    setorId?: string;
    atendenteId?: string;
    status?: string;
    mes?: string;
    ano?: string;
  }>;
}) {
  const sp = await searchParams;

  // O mês de hoje pelo relógio de São Paulo: o servidor roda em UTC e, à noite,
  // "hoje" lá já é o dia seguinte aqui — no dia 1º isso abriria o mês errado.
  const [anoHoje, mesHoje] = hojeISOSaoPaulo().split('-').map(Number);
  const mes = sp.mes ? Number(sp.mes) : mesHoje;
  const ano = sp.ano ? Number(sp.ano) : anoHoje;

  const filtros: FiltrosProspeccao = {
    setorId: sp.setorId || undefined,
    atendenteId: sp.atendenteId || undefined,
    status: (sp.status as FiltrosProspeccao['status']) || undefined,
    mes,
    ano,
  };

  const [setores, atendentes, prospeccoes, mesesDisponiveis, podeObservar] = await Promise.all([
    getSetores(),
    getAtendentes(true),
    getProspeccoes(filtros),
    getMesesDeProspeccao({ mes, ano }),
    // Se a checagem do Comercial falhar, a tela abre sem o botão de observação
    // em vez de não abrir: a Prospecção é usada pela agência inteira, e ela
    // não pode cair por causa de uma consulta que é só para liberar um botão.
    // Quem grava de verdade é a action, que faz a própria checagem.
    podeEditarComercial().catch(() => false),
  ]);

  const prospeccoesView = prospeccoes.map((p) => ({
    id: p.id,
    data: new Date(p.data).toISOString().slice(0, 10),
    nomeCliente: p.nomeCliente,
    telefone: p.telefone,
    oQueVende: p.oQueVende,
    status: p.status,
    observacao: p.observacao,
    setorId: p.setorId,
    atendenteId: p.atendenteId,
    setorNome: p.setor.nome,
    atendenteNome: p.atendente.nome,
  }));

  const mesAnterior = mes === 1 ? 12 : mes - 1;
  const anoAnterior = mes === 1 ? ano - 1 : ano;
  const mesSeguinte = mes === 12 ? 1 : mes + 1;
  const anoSeguinte = mes === 12 ? ano + 1 : ano;

  // Os filtros escolhidos viajam junto com a seta do mês: trocar de mês não
  // deve jogar fora o setor ou o status que a pessoa acabou de escolher.
  const comFiltros = (m: number, a: number) => {
    const params = new URLSearchParams();
    if (sp.setorId) params.set('setorId', sp.setorId);
    if (sp.atendenteId) params.set('atendenteId', sp.atendenteId);
    if (sp.status) params.set('status', sp.status);
    params.set('mes', String(m));
    params.set('ano', String(a));
    return `/prospeccao?${params.toString()}`;
  };

  const setaStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-muted)',
  } as const;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Prospecção</h1>
          <nav className="breadcrumb">
            <Link href="/" className="breadcrumb-link">Mural</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">{NOMES_MESES[mes - 1]} de {ano}</span>
          </nav>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Mesma navegação de mês do painel dos setores. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 4 }}>
            <Link href={comFiltros(mesAnterior, anoAnterior)} style={setaStyle} title="Mês anterior">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', padding: '0 8px' }}>
              {NOMES_MESES[mes - 1].slice(0, 3)}
            </span>
            <Link href={comFiltros(mesSeguinte, anoSeguinte)} style={setaStyle} title="Próximo mês">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <a href="/api/prospeccao/export" className="btn btn-secondary btn-sm">⬇ Excel (histórico completo)</a>
          <Link href="/prospeccao/cadastros" className="btn btn-secondary btn-sm">⚙ Cadastrar Funcionário</Link>
        </div>
      </div>

      <ProspeccaoManager
        prospeccoes={prospeccoesView}
        setores={setores.map((s) => ({ id: s.id, nome: s.nome }))}
        atendentes={atendentes.map((a) => ({ id: a.id, nome: a.nome }))}
        filtroSetorId={sp.setorId}
        filtroAtendenteId={sp.atendenteId}
        filtroStatus={sp.status}
        mes={mes}
        ano={ano}
        mesesDisponiveis={mesesDisponiveis.map((m) => ({
          ...m,
          rotulo: `${NOMES_MESES[m.mes - 1]} de ${m.ano}`,
        }))}
        podeObservar={podeObservar}
      />
    </div>
  );
}
