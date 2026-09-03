import { isAdmin } from '@/actions/admin';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import CalendarioDashboard from '@/components/CalendarioDashboard';
import PasswordPrompt from '@/components/PasswordPrompt';
import DeleteSetorButton from '@/components/DeleteSetorButton';
import DeletePopButton from '@/components/DeletePopButton';
import PopAtivoButton from '@/components/PopAtivoButton';
import PublicarInformativo from '@/components/PublicarInformativo';
import { podeEscreverNoSetor } from '@/actions/setorAcesso';
import { getAgendaDoSetor } from '@/actions/agenda';
import { ocorrenciasAtrasadas, agruparAtrasos, chaveFeito } from '@/lib/agenda';
import { getPopsBySetor } from '@/actions/pops';
import { getRegistrosMensais } from '@/actions/checklist';
import { calcularConformidade, calcularMargem } from '@/lib/conformidade';
import { hojeISOSaoPaulo, inicioPeriodoEditavel } from '@/lib/data';
import prisma from '@/lib/prisma';


export const dynamic = 'force-dynamic';

export default async function VisualizarSetor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>,
  searchParams: Promise<{ mes?: string, ano?: string }>
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const adminMode = await isAdmin();

  const setor = await prisma.setor.findUnique({
    where: { id: resolvedParams.id },
  });

  if (!setor) {
    notFound();
  }

  // Verificar proteção por senha
  if (setor.senha) {
    const cookieStore = await cookies();
    const isAuthed = cookieStore.get(`auth_setor_${setor.id}`);

    if (!isAuthed && !adminMode) {
      return <PasswordPrompt setorId={setor.id} setorNome={setor.nome} />;
    }
  }

  // Publicar no mural exige a senha do setor (ou ser admin): setor sem senha
  // não publica, porque o mural é visto pela agência inteira.
  const podePublicar = await podeEscreverNoSetor(resolvedParams.id);

  // Inclui POPs aposentados: contam nos dias em que valiam e precisam
  // continuar visíveis na lista para poderem ser reativados.
  const pops = await getPopsBySetor(resolvedParams.id, true);

  const hoje = new Date();
  const mesAtual = resolvedSearchParams.mes ? parseInt(resolvedSearchParams.mes) : hoje.getMonth() + 1;
  const anoAtual = resolvedSearchParams.ano ? parseInt(resolvedSearchParams.ano) : hoje.getFullYear();

  const registros = await getRegistrosMensais(resolvedParams.id, mesAtual, anoAtual);

  // Calcular métricas (dias úteis até hoje, a partir da criação do setor; dia útil sem checklist = 0%)
  // Métrica oficial da meta: percentualPerfeitos (dias 100% ÷ dias úteis).
  const { media: mediaConformidade, diasUteis, diasAbaixo100, percentualPerfeitos, bateuMeta, dias: diasLedger } =
    calcularConformidade(pops, registros, mesAtual, anoAtual, hoje, setor.createdAt);

  // O calendário mostra exatamente estas notas — não recalcula por conta própria,
  // senão volta a divergir do card de conformidade quando um POP é cadastrado.
  const conformidadePorDia: Record<number, number> = {};
  diasLedger.forEach((d) => { conformidadePorDia[d.dia] = d.conformidadeDia; });

  // Dias úteis que ninguém preencheu. Valem 0% e derrubam a nota do mês, mas
  // até agora o sistema sabia disso e não escrevia em lugar nenhum — só dava
  // para descobrir caçando os quadradinhos vermelhos no calendário.
  const diasEmBranco = diasLedger.filter((d) => !d.preenchido).map((d) => d.dia);
  const listaDiasEmBranco = diasEmBranco.length === 1
    ? String(diasEmBranco[0])
    : `${diasEmBranco.slice(0, -1).join(', ')} e ${diasEmBranco[diasEmBranco.length - 1]}`;

  const hojeSP = hojeISOSaoPaulo();
  const dataMinimaEdicao = inicioPeriodoEditavel(hojeSP);
  const mesAindaAberto = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01` >= dataMinimaEdicao;

  const [anoHoje, mesHoje] = hojeSP.split('-').map(Number);
  const ehMesCorrente = mesAtual === mesHoje && anoAtual === anoHoje;

  // Agenda do setor: não entra na nota, mas o atraso precisa aparecer aqui —
  // é o que a faz ser cobrada sem contaminar os 80%.
  const itensAgenda = await getAgendaDoSetor(resolvedParams.id);
  // Contado por processo, não por ocorrência: um item mensal esquecido por meses
  // é 1 processo atrasado, senão o aviso diria "14" e assustaria sem motivo.
  const atrasosAgenda = agruparAtrasos(ocorrenciasAtrasadas(
    itensAgenda,
    new Set(itensAgenda.flatMap((i) => i.feitos.map((d) => chaveFeito(i.id, d)))),
    hojeSP,
  ));

  // Margem: quantos dias ainda dá para perder sem sair da meta.
  //
  // A meta é medida sobre o mês INTEIRO, não sobre os dias já decorridos — por
  // isso o total de dias úteis vem de uma segunda passada no próprio motor, com
  // "hoje" no último dia do mês. Contar dia útil aqui na mão criaria uma segunda
  // regra do que é dia útil, que é exatamente o tipo de divergência que já deu
  // problema no calendário.
  const fimDoMes = new Date(Date.UTC(anoAtual, mesAtual, 0, 12, 0, 0));
  const { diasUteis: diasUteisMes } = calcularConformidade(
    pops, registros, mesAtual, anoAtual, fimDoMes, setor.createdAt,
  );
  const margem = calcularMargem(diasUteisMes, diasAbaixo100);

  // Mês anterior, só para comparar.
  const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1;
  const anoAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual;
  const registrosAnterior = await getRegistrosMensais(resolvedParams.id, mesAnterior, anoAnterior);
  const anterior = calcularConformidade(
    pops, registrosAnterior, mesAnterior, anoAnterior, hoje, setor.createdAt,
  );
  // Sem dias a cobrar no mês anterior (setor novo) não há o que comparar.
  const temComparacao = anterior.diasUteis > 0 && diasUteis > 0;

  const nomeMeses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <nav className="breadcrumb" style={{ marginBottom: 4 }}>
            <Link href="/" className="">Setores</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">{setor.nome}</span>
          </nav>
          <h1 className="page-title">{setor.nome}</h1>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <Link href={`/setores/${setor.id}/checklist`} className="btn btn-success btn-sm">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Preencher Checklist
          </Link>

          {adminMode && (
            <>
              <Link href={`/setores/${setor.id}/editar`} className="btn btn-secondary btn-sm">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar
              </Link>
              <DeleteSetorButton setorId={setor.id} setorNome={setor.nome} />
              <Link href="/pops/novo" className="btn btn-primary btn-sm">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Novo POP
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      {pops.length > 0 && (
        <div className="grid grid-cols-4" style={{ gap: 16, marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-icon primary">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <div className="stat-label">Conformidade (dias perfeitos)</div>
              {diasUteis === 0 ? (
                <>
                  {/* Sem nenhum dia a cobrar ainda (setor novo, ou mês recém-começado).
                      Exibir "0%" aqui faria um setor sem histórico parecer fracasso. */}
                  <div className="stat-value" style={{ color: 'var(--text-muted)' }}>—</div>
                  <div className="stat-sub">nenhum dia a cobrar ainda</div>
                </>
              ) : (
                <>
                  <div className="stat-value" style={{ color: bateuMeta ? 'var(--success)' : 'var(--danger)' }}>
                    {percentualPerfeitos}%
                  </div>
                  <div className="stat-sub">méd. ponderada {mediaConformidade}% · Seg–Sáb</div>
                </>
              )}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon info">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <div className="stat-label">POPs Monitorados</div>
              <div className="stat-value">{pops.length}</div>
              <div className="stat-sub">procedimentos ativos</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon warning">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <div className="stat-label">Meta de Qualidade</div>
              <div className="stat-value">80%</div>
              <div className="progress" style={{ marginTop: 8, width: 80 }}>
                <div className="progress-bar primary" style={{ width: '80%' }} />
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: diasAbaixo100 === 0 ? 'rgba(34,197,94,0.12)' : 'rgba(251,191,36,0.12)' }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke={diasAbaixo100 === 0 ? 'var(--success)' : 'var(--warning)'} strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <div className="stat-label">Dias Abaixo de 100%</div>
              <div className="stat-value" style={{ color: diasAbaixo100 === 0 ? 'var(--success)' : 'var(--warning)' }}>{diasAbaixo100}</div>
              <div className="stat-sub">{diasAbaixo100 === 0 ? 'sem pendências!' : 'dias com pendência'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Agenda do setor — processos com data marcada, fora da conta da nota */}
      {atrasosAgenda.length > 0 ? (
        <div className="alert alert-warning" style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span>
            📅 <strong>
              {atrasosAgenda.length === 1
                ? '1 processo da agenda atrasado'
                : `${atrasosAgenda.length} processos da agenda atrasados`}
            </strong>{' '}
            — não afeta a nota, mas está esperando.
          </span>
          <Link href={`/setores/${setor.id}/agenda`} className="btn btn-secondary btn-sm">
            Ver agenda
          </Link>
        </div>
      ) : (
        <div style={{ marginTop: 24 }}>
          <Link href={`/setores/${setor.id}/agenda`} className="btn btn-secondary btn-sm">
            📅 Agenda do setor
            {itensAgenda.length > 0 && (
              <span style={{ opacity: 0.7, marginLeft: 6 }}>· em dia</span>
            )}
          </Link>
        </div>
      )}

      {/* Informativo do setor para o mural — só para quem entrou com a senha */}
      {podePublicar && (
        <PublicarInformativo setorId={setor.id} setorNome={setor.nome} />
      )}

      {/* Calendar or empty state */}
      {pops.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3>Nenhum POP cadastrado</h3>
            <p>Este setor ainda não possui procedimentos operacionais cadastrados.</p>
            {adminMode && (
              <Link href="/pops/novo" className="btn btn-primary">Adicionar Primeiro POP</Link>
            )}
          </div>
        </div>
      ) : (
        <>
          {ehMesCorrente && diasUteisMes > 0 && (
            <div
              className={`alert ${
                margem.jaPerdeu ? 'alert-danger' : margem.restantes === 0 ? 'alert-warning' : 'alert-success'
              }`}
              style={{ marginTop: 24 }}
            >
              {margem.jaPerdeu ? (
                <>
                  ❌ <strong>{nomeMeses[mesAtual - 1]}: {percentualPerfeitos}%.</strong>{' '}
                  O limite era de {margem.maxPerdas} {margem.maxPerdas === 1 ? 'dia' : 'dias'} e
                  já foram {diasAbaixo100} — a meta de 80% não é mais alcançável neste mês.
                </>
              ) : margem.restantes === 0 ? (
                <>
                  ⚠️ <strong>{nomeMeses[mesAtual - 1]}: {percentualPerfeitos}%.</strong>{' '}
                  Mais um dia perdido e o setor sai da meta.
                </>
              ) : (
                <>
                  ✅ <strong>{nomeMeses[mesAtual - 1]}: {percentualPerfeitos}%.</strong>{' '}
                  Ainda dá para perder {margem.restantes}{' '}
                  {margem.restantes === 1 ? 'dia' : 'dias'} e continuar dentro da meta.
                </>
              )}
            </div>
          )}

          {diasEmBranco.length > 0 && (
            <div className="alert alert-warning" style={{ marginTop: 24 }}>
              📌 <strong>
                {diasEmBranco.length === 1
                  ? '1 dia em branco'
                  : `${diasEmBranco.length} dias em branco`}
              </strong>{' '}
              neste mês: {listaDiasEmBranco}.{' '}
              {mesAindaAberto
                ? 'Cada um deles conta como 0% — clique no dia no calendário para preencher.'
                : 'Mês fechado: esses dias contam como 0% e não podem mais ser preenchidos.'}
            </div>
          )}

          {temComparacao && (
            <div style={{ marginTop: 12, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {nomeMeses[mesAnterior - 1]}: <strong>{anterior.percentualPerfeitos}%</strong>
              {' → '}
              {nomeMeses[mesAtual - 1]}: <strong style={{ color: 'var(--text-main)' }}>{percentualPerfeitos}%</strong>
              {' '}
              {percentualPerfeitos > anterior.percentualPerfeitos ? (
                <span style={{ color: 'var(--success)' }}>
                  ↑ {percentualPerfeitos - anterior.percentualPerfeitos} pontos
                </span>
              ) : percentualPerfeitos < anterior.percentualPerfeitos ? (
                <span style={{ color: 'var(--danger)' }}>
                  ↓ {anterior.percentualPerfeitos - percentualPerfeitos} pontos
                </span>
              ) : (
                <span>→ igual</span>
              )}
              {ehMesCorrente && ' (mês em andamento)'}
            </div>
          )}

          <CalendarioDashboard
            setorId={resolvedParams.id}
            registros={registros.map(r => ({
              ...r,
              respostas: r.respostas as Record<string, boolean>
            }))}
            mes={mesAtual}
            ano={anoAtual}
            adminMode={adminMode}
            mediaMensal={percentualPerfeitos}
            diasConsiderados={diasUteis}
            conformidadePorDia={conformidadePorDia}
            dataMinimaEdicao={dataMinimaEdicao}
          />

          {/* POPs List */}
          <div className="card" style={{ marginTop: 24 }}>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <span>
                POPs Cadastrados (Preenchidos no Mês)
                <span className="badge badge-primary" style={{ marginLeft: 8, fontSize: '0.75rem' }}>
                  {pops.filter(pop => registros.some(reg => (reg.respostas as Record<string, boolean>)?.[pop.id] !== undefined)).length}
                </span>
              </span>

              {/* POP é procedimento de trabalho: quem tem acesso ao setor baixa
                  os próprios, sem precisar pedir para o admin. */}
              {pops.length > 0 && (
                <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {adminMode && (
                    <Link href={`/setores/${setor.id}/pesos`} className="btn btn-secondary btn-sm">
                      ⚖ Revisar pesos
                    </Link>
                  )}
                  <a href={`/api/pops/export?setorId=${setor.id}`} className="btn btn-secondary btn-sm">
                    ⬇ Excel
                  </a>
                  <a href={`/api/pops/export/pdf?setorId=${setor.id}`} className="btn btn-secondary btn-sm">
                    ⬇ PDF
                  </a>
                </span>
              )}
            </div>

            {pops.filter(pop => pop.desativadoEm !== null || registros.some(reg => (reg.respostas as Record<string, boolean>)?.[pop.id] !== undefined)).map((pop) => (
              <div key={pop.id} style={{
                padding: '14px 0',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 16
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-main)' }}>
                      {pop.titulo}
                    </span>
                    <span className="badge badge-primary" style={{ fontSize: '0.6875rem' }}>
                      Peso {pop.peso}
                    </span>
                    {pop.desativadoEm && (
                      <span className="badge badge-warning" style={{ fontSize: '0.6875rem' }}>
                        desativado
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    <strong style={{ color: 'var(--text-main)' }}>Avaliar:</strong> {pop.orientacaoAvaliacao}
                  </p>
                </div>

                {adminMode && (
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <Link href={`/pops/${pop.id}/editar`} className="btn btn-secondary btn-sm">
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </Link>
                    <PopAtivoButton
                      popId={pop.id}
                      setorId={resolvedParams.id}
                      popTitulo={pop.titulo}
                      ativo={pop.desativadoEm === null}
                    />
                    <DeletePopButton popId={pop.id} setorId={resolvedParams.id} popTitulo={pop.titulo} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
