'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ocorrenciasNoMes, ocorrenciasAtrasadas, agruparAtrasos, rotuloFrequencia, diasNoMes,
  INTERVALOS_MESES, ItemAgendaCalc, Frequencia,
} from '@/lib/agenda';
import {
  criarItemAgenda, alternarFeito, alternarItemAgenda, excluirItemAgenda, marcarVariasFeitas,
} from '@/actions/agenda';

export interface ItemAgendaView extends ItemAgendaCalc {
  titulo: string;
  observacao?: string | null;
  ativo: boolean;
  feitos: string[];
}

interface Props {
  setorId: string;
  itens: ItemAgendaView[];
  mes: number;
  ano: number;
  hojeISO: string;
  podeEditar: boolean;
}

const NOMES_MES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function dataBR(iso: string) {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

export default function AgendaSetor({ setorId, itens, mes, ano, hojeISO, podeEditar }: Props) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  // Clicar num dia abre o cadastro já apontando para aquele dia — é o que se
  // espera de um calendário. Como aqui todo processo é repetido, o dia clicado
  // é ambíguo ("toda segunda" ou "dia 14 de todo mês"?), então os dois campos
  // vêm preenchidos e trocar a opção não obriga a escolher de novo.
  const [inicial, setInicial] = useState<{ diaSemana: number; diaMes: number } | null>(null);

  function abrirNovoEm(data: string) {
    if (!podeEditar) return;
    const [a, m, d] = data.split('-').map(Number);
    setInicial({ diaSemana: new Date(Date.UTC(a, m - 1, d)).getUTCDay(), diaMes: d });
    setFormAberto(true);
    // O cadastro fica no card de baixo; sem isso o clique parece não fazer nada.
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  const feitosSet = new Set(itens.flatMap((i) => i.feitos.map((d) => `${i.id}|${d}`)));

  // Quais processos caem em cada dia do mês em tela.
  const porDia = new Map<string, ItemAgendaView[]>();
  for (const item of itens) {
    for (const data of ocorrenciasNoMes(item, mes, ano)) {
      if (!porDia.has(data)) porDia.set(data, []);
      porDia.get(data)!.push(item);
    }
  }

  // Agrupado por processo: um item mensal esquecido por meses é UMA pendência,
  // não uma linha por mês.
  const atrasos = agruparAtrasos(ocorrenciasAtrasadas(itens, feitosSet, hojeISO));
  const tituloDe = new Map(itens.map((i) => [i.id, i.titulo]));

  const total = diasNoMes(mes, ano);
  const primeiroDiaSemana = new Date(Date.UTC(ano, mes - 1, 1)).getUTCDay();
  const prev = mes === 1 ? { m: 12, a: ano - 1 } : { m: mes - 1, a: ano };
  const next = mes === 12 ? { m: 1, a: ano + 1 } : { m: mes + 1, a: ano };

  async function marcar(itemId: string, data: string, feito: boolean) {
    if (!podeEditar) return;
    setOcupado(`${itemId}|${data}`);
    setErro(null);
    try {
      await alternarFeito(itemId, data, feito);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div>
      {/* O que venceu e ninguém marcou */}
      {atrasos.length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 16 }}>
          <strong>
            {atrasos.length === 1 ? '1 processo atrasado' : `${atrasos.length} processos atrasados`}
          </strong>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {atrasos.map((a) => (
              <div key={a.itemId} style={{ fontSize: '0.875rem' }}>
                • {tituloDe.get(a.itemId)} — atrasado desde {dataBR(a.desde)}{' '}
                <span style={{ opacity: 0.75 }}>
                  ({a.diasDeAtraso === 1 ? '1 dia' : `${a.diasDeAtraso} dias`}
                  {a.quantidade > 1 ? `, ${a.quantidade} vezes` : ''})
                </span>
                {podeEditar && (
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ marginLeft: 8, padding: '1px 8px', fontSize: '0.72rem' }}
                    disabled={ocupado === a.itemId}
                    onClick={async () => {
                      setOcupado(a.itemId);
                      setErro(null);
                      try {
                        await marcarVariasFeitas(a.itemId, a.datas);
                        router.refresh();
                      } catch (e) {
                        setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
                      } finally {
                        setOcupado(null);
                      }
                    }}
                  >
                    {a.quantidade > 1 ? `dar baixa nas ${a.quantidade}` : 'marcar como feito'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {erro && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{erro}</div>}

      {/* Calendário do mês */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ fontSize: '1rem', fontWeight: 600 }}>
            {NOMES_MES[mes - 1]} de {ano}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 4 }}>
            <Link href={`/setores/${setorId}/agenda?mes=${prev.m}&ano=${prev.a}`} className="btn btn-secondary btn-sm" style={{ padding: '2px 10px' }}>‹</Link>
            <Link href={`/setores/${setorId}/agenda`} className="btn btn-secondary btn-sm" style={{ padding: '2px 10px' }}>Hoje</Link>
            <Link href={`/setores/${setorId}/agenda?mes=${next.m}&ano=${next.a}`} className="btn btn-secondary btn-sm" style={{ padding: '2px 10px' }}>›</Link>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
          {DIAS_SEMANA.map((d) => (
            <div key={d} style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 600 }}>
              {d}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {Array.from({ length: primeiroDiaSemana }, (_, i) => (
            <div key={`vazio-${i}`} />
          ))}

          {Array.from({ length: total }, (_, i) => i + 1).map((dia) => {
            const data = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            const doDia = porDia.get(data) ?? [];
            const ehHoje = data === hojeISO;
            const passou = data < hojeISO;
            // Domingo não tem expediente. A coluna fica (para a grade continuar
            // igual à do Registro de Atividades, que também marca domingo como
            // OFF), mas apagada e sem aceitar cadastro.
            const ehDomingo = new Date(`${data}T00:00:00`).getDay() === 0;

            return (
              <div
                key={dia}
                onClick={ehDomingo ? undefined : () => abrirNovoEm(data)}
                title={
                  ehDomingo
                    ? 'Domingo — sem expediente'
                    : podeEditar ? `Cadastrar um processo para este dia (${dia})` : undefined
                }
                style={{
                  minHeight: 84,
                  border: `1px solid ${ehHoje ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: 4,
                  background: ehDomingo
                    ? 'var(--surface-2)'
                    : ehHoje ? 'var(--primary-light, var(--surface-2))' : 'var(--surface-1, transparent)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                  cursor: !ehDomingo && podeEditar ? 'pointer' : 'default',
                  opacity: ehDomingo ? 0.45 : 1,
                }}
              >
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: ehHoje ? 700 : 500,
                  color: ehHoje ? 'var(--primary)' : 'var(--text-muted)',
                  display: 'flex',
                  justifyContent: podeEditar && !ehDomingo ? 'space-between' : 'flex-end',
                  alignItems: 'center',
                }}>
                  {podeEditar && !ehDomingo && (
                    <span style={{ color: 'var(--text-muted)', opacity: 0.5, fontSize: '0.8125rem', lineHeight: 1 }}>+</span>
                  )}
                  <span>{dia}</span>
                </div>

                {doDia.map((item) => {
                  const feito = feitosSet.has(`${item.id}|${data}`);
                  const atrasado = !feito && passou;
                  const chave = `${item.id}|${data}`;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={!podeEditar || ocupado === chave}
                      onClick={(e) => {
                        // Senão o clique sobe para a célula e abre o cadastro
                        // em vez de marcar como feito.
                        e.stopPropagation();
                        marcar(item.id, data, !feito);
                      }}
                      title={`${item.titulo} — ${feito ? 'feito' : atrasado ? 'atrasado' : 'a fazer'}${podeEditar ? ' (clique para marcar)' : ''}`}
                      style={{
                        textAlign: 'left',
                        fontSize: '0.6875rem',
                        lineHeight: 1.25,
                        padding: '3px 5px',
                        borderRadius: 4,
                        border: 'none',
                        cursor: podeEditar ? 'pointer' : 'default',
                        background: feito
                          ? 'var(--success-light)'
                          : atrasado ? 'var(--danger-light)' : 'var(--surface-2)',
                        color: feito
                          ? 'var(--success)'
                          : atrasado ? '#c0392b' : 'var(--text-main)',
                        textDecoration: feito ? 'line-through' : 'none',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        width: '100%',
                        opacity: ocupado === chave ? 0.5 : 1,
                      }}
                    >
                      {feito ? '✓ ' : atrasado ? '! ' : ''}{item.titulo}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 14, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: 'var(--success)', marginRight: 5 }} />feito</span>
          <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: 'var(--danger)', marginRight: 5 }} />atrasado</span>
          <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: 'var(--border)', marginRight: 5 }} />a fazer</span>
          {podeEditar && <span>· clique no processo para marcar, ou no dia vazio para cadastrar</span>}
        </div>
      </div>

      {/* Processos cadastrados */}
      <div className="card" style={{ marginTop: 16 }} ref={formRef}>
        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span>Processos deste setor</span>
          {podeEditar && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => { setInicial(null); setFormAberto((v) => !v); }}
            >
              {formAberto ? 'Fechar' : '+ Novo processo'}
            </button>
          )}
        </div>

        {formAberto && podeEditar && (
          <FormNovoItem
            // Remonta quando vem de um clique em outro dia, para os campos
            // recomeçarem apontando para o dia certo.
            key={inicial ? `${inicial.diaSemana}-${inicial.diaMes}` : 'padrao'}
            setorId={setorId}
            diaSemanaInicial={inicial?.diaSemana}
            diaMesInicial={inicial?.diaMes}
            onPronto={() => { setFormAberto(false); setInicial(null); router.refresh(); }}
          />
        )}

        {itens.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Nenhum processo cadastrado ainda. Use <strong>+ Novo processo</strong> para incluir, por
            exemplo, &quot;validar o proter — toda segunda&quot;.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {itens.map((item, i) => (
              <div
                key={item.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                  padding: '10px 0',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                  opacity: item.ativo ? 1 : 0.55,
                }}
              >
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                    {item.titulo}
                    {!item.ativo && (
                      <span className="badge badge-warning" style={{ marginLeft: 6, fontSize: '0.65rem' }}>pausado</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {rotuloFrequencia(item)}
                    {item.observacao ? ` · ${item.observacao}` : ''}
                  </div>
                </div>
                {podeEditar && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={ocupado === item.id}
                      onClick={async () => {
                        setOcupado(item.id);
                        try { await alternarItemAgenda(item.id); router.refresh(); }
                        finally { setOcupado(null); }
                      }}
                    >
                      {item.ativo ? 'Pausar' : 'Reativar'}
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      disabled={ocupado === item.id}
                      onClick={async () => {
                        if (!confirm(`Excluir "${item.titulo}" da agenda?\n\nO histórico do que já foi marcado como feito também sai.`)) return;
                        setOcupado(item.id);
                        try { await excluirItemAgenda(item.id); router.refresh(); }
                        finally { setOcupado(null); }
                      }}
                    >
                      Excluir
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FormNovoItem({
  setorId,
  onPronto,
  diaSemanaInicial,
  diaMesInicial,
}: {
  setorId: string;
  onPronto: () => void;
  diaSemanaInicial?: number;
  diaMesInicial?: number;
}) {
  const [frequencia, setFrequencia] = useState<Frequencia>('SEMANAL');
  const [semanaDoMes, setSemanaDoMes] = useState(1);
  const [titulo, setTitulo] = useState('');
  const [observacao, setObservacao] = useState('');
  // Domingo (0) não é dia de trabalho e nem aparece na lista de opções, então
  // um clique num domingo cai na segunda.
  const [diaSemana, setDiaSemana] = useState(
    diaSemanaInicial && diaSemanaInicial >= 1 && diaSemanaInicial <= 6 ? diaSemanaInicial : 1,
  );
  const [diaMes, setDiaMes] = useState(diaMesInicial ?? 5);
  const [intervaloMeses, setIntervaloMeses] = useState(1);
  const [mesBase, setMesBase] = useState(1);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const usaMes = frequencia === 'MENSAL' || frequencia === 'MENSAL_SEMANA';
      await criarItemAgenda(setorId, {
        titulo, observacao,
        frequencia,
        diaSemana: frequencia === 'SEMANAL' || frequencia === 'MENSAL_SEMANA' ? diaSemana : null,
        diaMes: frequencia === 'MENSAL' ? diaMes : null,
        semanaDoMes: frequencia === 'MENSAL_SEMANA' ? semanaDoMes : null,
        intervaloMeses: usaMes ? intervaloMeses : 1,
        mesBase: usaMes ? mesBase : null,
      });
      onPronto();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 16 }}>
      <div className="form-group">
        <label className="form-label">O que é *</label>
        <input
          className="form-input"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex: Validar o proter"
          maxLength={80}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Quando</label>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {([
            ['DIARIA', 'Todo dia'],
            ['SEMANAL', 'Toda semana'],
            ['MENSAL', 'Num dia do mês'],
            ['MENSAL_SEMANA', 'Numa semana do mês'],
          ] as [Frequencia, string][]).map(([valor, rotulo]) => (
            <label key={valor} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', cursor: 'pointer' }}>
              <input type="radio" checked={frequencia === valor} onChange={() => setFrequencia(valor)} />
              {rotulo}
            </label>
          ))}
        </div>
      </div>

      {frequencia === 'DIARIA' && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 12 }}>
          Aparece de segunda a sábado. Domingo fica de fora, porque não tem expediente.
        </p>
      )}

      {frequencia === 'MENSAL_SEMANA' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Qual semana</label>
            <select className="form-select" value={semanaDoMes} onChange={(e) => setSemanaDoMes(Number(e.target.value))}>
              <option value={1}>Primeira</option>
              <option value={2}>Segunda</option>
              <option value={3}>Terceira</option>
              <option value={4}>Quarta</option>
              <option value={-1}>Última</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Dia da semana</label>
            <select className="form-select" value={diaSemana} onChange={(e) => setDiaSemana(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6].map((d) => (
                <option key={d} value={d}>{['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][d]}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Repete</label>
            <select className="form-select" value={intervaloMeses} onChange={(e) => setIntervaloMeses(Number(e.target.value))}>
              {INTERVALOS_MESES.map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? 'Todo mês' : n === 12 ? 'Uma vez por ano' : `A cada ${n} meses`}
                </option>
              ))}
            </select>
          </div>
          {intervaloMeses > 1 && (
            <div className="form-group">
              <label className="form-label">Contando de</label>
              <select className="form-select" value={mesBase} onChange={(e) => setMesBase(Number(e.target.value))}>
                {NOMES_MES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {frequencia === 'SEMANAL' ? (
        <div className="form-group">
          <label className="form-label">Dia da semana</label>
          <select className="form-select" style={{ maxWidth: 220 }} value={diaSemana} onChange={(e) => setDiaSemana(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6].map((d) => (
              <option key={d} value={d}>{['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][d]}</option>
            ))}
          </select>
        </div>
      ) : frequencia === 'MENSAL' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Dia do mês</label>
            <input
              type="number" min={1} max={31} className="form-input"
              value={diaMes} onChange={(e) => setDiaMes(Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Repete</label>
            <select className="form-select" value={intervaloMeses} onChange={(e) => setIntervaloMeses(Number(e.target.value))}>
              {INTERVALOS_MESES.map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? 'Todo mês' : n === 12 ? 'Uma vez por ano' : `A cada ${n} meses`}
                </option>
              ))}
            </select>
          </div>
          {intervaloMeses > 1 && (
            <div className="form-group">
              <label className="form-label">Contando de</label>
              <select className="form-select" value={mesBase} onChange={(e) => setMesBase(Number(e.target.value))}>
                {NOMES_MES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
          )}
        </div>
      ) : null}

      {/* Confirmação em português do que foi escolhido — as combinações de
          semana, dia e intervalo são fáceis de errar sem ver o resultado. */}
      {frequencia !== 'DIARIA' && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: -4, marginBottom: 12 }}>
          Vai aparecer: <strong>{rotuloFrequencia({
            id: 'previa', frequencia, diaSemana, diaMes, semanaDoMes, intervaloMeses, mesBase,
          })}</strong>
        </p>
      )}

      <div className="form-group">
        <label className="form-label">Observação (opcional)</label>
        <input
          className="form-input"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Algum detalhe que ajude quem for fazer"
          maxLength={160}
        />
      </div>

      {erro && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{erro}</div>}

      <button type="submit" className="btn btn-primary btn-sm" disabled={salvando}>
        {salvando ? 'Salvando…' : 'Adicionar à agenda'}
      </button>
    </form>
  );
}
