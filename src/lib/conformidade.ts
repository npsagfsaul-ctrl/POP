// Cálculo único de conformidade, compartilhado entre o card do setor,
// o rodapé do calendário, o relatório do setor e o relatório do admin —
// para que todos mostrem sempre o mesmo número.
//
// Regra (definida com o usuário):
// - Considera os DIAS ÚTEIS (Seg–Sáb) do mês, do dia 1 até hoje
//   (dias futuros do mês corrente NÃO entram na conta).
// - Dias antes da criação do Setor não entram na conta (setor não existia).
// - Peso total do dia considera apenas POPs já existentes naquele dia
//   (POP criado no meio do mês não penaliza dias anteriores à sua criação).
// - Se nenhum POP existia ainda naquele dia (peso total = 0), o dia conta
//   como 100% (neutro — nada era exigido, nada há para falhar).
// - Dia útil COM checklist: conformidade = pesoAtingido / pesoTotalDoDia.
// - Dia útil SEM checklist (e com pelo menos 1 POP exigível): conta como 0%.
//
// - Num dia preenchido, só é exigível o POP que estava no formulário na hora
//   em que ele foi salvo (isto é, cuja chave existe em `respostas`). Assim um
//   POP cadastrado à tarde não vira pendência num checklist salvo de manhã.
// - Registro criado só para o comentário do admin (`respostas: {}`) NÃO é um
//   checklist preenchido.
//
// Métrica oficial da meta/bônus: `percentualPerfeitos` (dias 100% ÷ dias
// úteis) — qualquer pendência, por menor que seja, tira o dia de "perfeito".
// `media` (ponderada pelo peso) é só informativa/secundária.

import { inicioDeHojeSaoPaulo } from './data';

export interface PopPeso {
  id: string;
  peso: number;
  titulo: string;
  createdAt: Date | string;
  /** Quando o POP foi aposentado. null/ausente = ainda vale. */
  desativadoEm?: Date | string | null;
}

export interface RegistroConformidade {
  data: Date | string;
  respostas: Record<string, boolean> | unknown;
  /** { popId: atendenteId } — quem causou a pendência daquele POP naquele dia. */
  /**
   * { popId: [atendenteId, ...] } — quem errou aquele POP naquele dia.
   * Registros antigos guardavam um único id como texto; a leitura aceita os
   * dois formatos, então nada precisou ser migrado.
   */
  responsaveis?: Record<string, string | string[]> | unknown;
}

/** Dia útil (passado) sem checklist preenchido conta como este valor de conformidade. */
export const VALOR_DIA_SEM_CHECKLIST = 0;

/** Meta de conformidade usada para o bônus/remuneração. */
export const META_CONFORMIDADE = 80;

export interface PendenciaDia {
  id: string;
  titulo: string;
  peso: number;
  /** Funcionário apontado como responsável, ou null se não foi indicado. */
  /**
   * Todos os apontados por esta pendência. Vazio quando ninguém foi indicado.
   *
   * Mais de um nome é permitido: se duas pessoas deixaram o mesmo POP passar,
   * as duas erraram. O SETOR perde o dia uma vez só (a pendência é do POP),
   * mas cada pessoa carrega o peso cheio no próprio registro — dividir o peso
   * faria com que apontar mais gente aliviasse a conta de todo mundo.
   */
  responsaveisIds: string[];
}

export interface DiaConformidade {
  dia: number;
  data: string; // YYYY-MM-DD
  preenchido: boolean;
  pesoTotalDoDia: number;
  pesoAtingido: number;
  conformidadeDia: number; // 0–100
  /** POPs marcados com ocorrência nesse dia. Vazio se o dia foi 100% ou não preenchido. */
  pendencias: PendenciaDia[];
}

export interface ResultadoConformidade {
  /** Média ponderada pelo peso dos POPs (0–100). Informativa/secundária —
   * a métrica oficial para a meta é `percentualPerfeitos`. */
  media: number;
  /** Dias úteis considerados (Seg–Sáb, do dia 1 até hoje, a partir da criação do setor). */
  diasUteis: number;
  /** Dias úteis que tiveram checklist preenchido. */
  diasPreenchidos: number;
  /** Dias úteis sem checklist (pendências). */
  diasPendentes: number;
  /** Dias úteis com conformidade abaixo de 100% (inclui os sem checklist). */
  diasAbaixo100: number;
  /** Dias úteis com 100% de conformidade (sem nenhuma pendência). */
  diasPerfeitos: number;
  /** % de dias perfeitos sobre os dias úteis (dias 100% ÷ dias úteis). Métrica oficial da meta. */
  percentualPerfeitos: number;
  /** true se percentualPerfeitos bateu a meta (>= META_CONFORMIDADE). */
  bateuMeta: boolean;
  /** Dias úteis preenchidos mas com alguma pendência (nem perfeitos, nem em branco). */
  diasComPendencia: number;
  /** Soma de pontos percentuais perdidos nos dias NÃO preenchidos (média ponderada). */
  perdaPorDiaNaoPreenchido: number;
  /** Soma de pontos percentuais perdidos nos dias preenchidos com pendência (<100%). */
  perdaPorPendencia: number;
  /** Detalhamento dia a dia (auditoria), só dos dias efetivamente contados. */
  dias: DiaConformidade[];
}

/**
 * Aceita os dois formatos gravados em `responsaveis`: o antigo, com um único id
 * como texto, e o atual, com lista. Evita ter que migrar registros já salvos.
 */
function normalizarResponsaveis(valor: unknown): string[] {
  if (typeof valor === 'string') return valor.trim() ? [valor.trim()] : [];
  if (Array.isArray(valor)) {
    return [...new Set(valor.filter((v): v is string => typeof v === 'string' && v.trim() !== ''))];
  }
  return [];
}

/** Meia-noite local do dia informado. */
function inicioDoDiaLocal(ano: number, mes: number, dia: number): Date {
  return new Date(`${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}T00:00:00`);
}

/** Último instante local do dia informado (23:59:59.999) — usado para comparar
 * datas de criação (instantes) contra "esse dia já tinha acontecido". */
function fimDoDiaLocal(ano: number, mes: number, dia: number): Date {
  const d = inicioDoDiaLocal(ano, mes, dia);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function calcularConformidade(
  pops: PopPeso[],
  registros: RegistroConformidade[],
  mes: number, // 1–12
  ano: number,
  hoje: Date = new Date(),
  setorCreatedAt?: Date | string,
): ResultadoConformidade {
  // Mapeia registros pelo dia do mês (data é @db.Date = meia-noite UTC).
  const registrosPorDia = new Map<number, RegistroConformidade>();
  registros.forEach((reg) => {
    registrosPorDia.set(new Date(reg.data).getUTCDate(), reg);
  });

  const diasNoMes = new Date(ano, mes, 0).getDate();
  // "Hoje" precisa ser o dia de Brasília, não o do servidor (que roda em UTC).
  // Sem isso, a partir das 21h daqui o dia seguinte entrava como dia útil
  // sem checklist = 0%, e a nota do setor caía toda noite.
  const limite = inicioDeHojeSaoPaulo(hoje);

  const setorCreatedAtMs = setorCreatedAt ? new Date(setorCreatedAt).getTime() : null;

  let soma = 0;
  let diasUteis = 0;
  let diasPreenchidos = 0;
  let diasAbaixo100 = 0;
  let perdaPorDiaNaoPreenchido = 0;
  let perdaPorPendencia = 0;
  const dias: DiaConformidade[] = [];

  for (let dia = 1; dia <= diasNoMes; dia++) {
    const dataDia = inicioDoDiaLocal(ano, mes, dia);

    if (dataDia.getDay() === 0) continue; // pula domingo
    if (dataDia > limite) continue; // ignora dias futuros

    const fimDia = fimDoDiaLocal(ano, mes, dia);

    // Setor ainda não existia neste dia: nem entra na conta.
    if (setorCreatedAtMs !== null && fimDia.getTime() < setorCreatedAtMs) continue;

    const reg = registrosPorDia.get(dia);
    const respostas = (reg?.respostas ?? null) as Record<string, boolean> | null;
    const responsaveis = (reg?.responsaveis ?? null) as Record<string, string | string[]> | null;

    // `salvarComentarioAdmin` cria um registro com `respostas: {}` só para
    // guardar o comentário. Isso não é um checklist preenchido — sem esta
    // checagem o dia mudava de "não preenchido" para "preenchido com todos os
    // POPs em pendência", apontando a causa errada no Fechamento do Mês.
    const preenchido = !!respostas && Object.keys(respostas).length > 0;

    // O dia de HOJE só entra na conta depois de preenchido. Sem isso, o dia
    // corrente contava como perdido desde a meia-noite e a nota aparecia pior
    // que a realidade durante todo o expediente, recuperando só no fim.
    // Dias passados sem checklist continuam contando como 0% normalmente.
    const ehHoje = dataDia.getTime() === limite.getTime();
    if (ehHoje && !preenchido) continue;

    diasUteis++;

    // Apenas POPs que já existiam até o fim deste dia entram no cálculo do dia
    // (evita que um POP criado no meio do mês penalize dias anteriores à sua criação).
    // POP desativado deixa de ser cobrado a partir do DIA SEGUINTE ao da
    // desativação — assim os dias em que ele ainda valia continuam valendo, e
    // meses já fechados não são reescritos ao aposentar um procedimento.
    const popsExistentes = pops.filter((pop) => {
      if (new Date(pop.createdAt).getTime() > fimDia.getTime()) return false;
      if (!pop.desativadoEm) return true;
      return new Date(pop.desativadoEm).getTime() > dataDia.getTime();
    });

    // Num dia preenchido, exigível é só o POP que estava no formulário quando
    // ele foi salvo — ou seja, cuja chave existe em `respostas`. A ausência da
    // chave significa que o POP foi cadastrado depois do preenchimento, e ele
    // não pode virar pendência (nem inflar o peso total) retroativamente.
    const popsDoDia =
      preenchido
        ? popsExistentes.filter((pop) =>
            Object.prototype.hasOwnProperty.call(respostas, pop.id),
          )
        : popsExistentes;

    const pesoTotalDoDia = popsDoDia.reduce((acc, p) => acc + p.peso, 0);

    let pesoAtingido = 0;
    const pendencias: PendenciaDia[] = [];
    let conformidadeDia: number;

    if (preenchido) {
      popsDoDia.forEach((pop) => {
        if (respostas![pop.id] === true) {
          pesoAtingido += pop.peso;
        } else if (pesoTotalDoDia > 0) {
          pendencias.push({
            id: pop.id,
            titulo: pop.titulo,
            peso: pop.peso,
            responsaveisIds: normalizarResponsaveis(responsaveis?.[pop.id]),
          });
        }
      });
      conformidadeDia = pesoTotalDoDia > 0 ? (pesoAtingido / pesoTotalDoDia) * 100 : 100;
      diasPreenchidos++;
    } else {
      // Dia sem checklist: 0%. Exceção — se nenhum POP era exigível ainda
      // (setor criado mas sem POPs), não há o que falhar: conta como neutro.
      conformidadeDia = pesoTotalDoDia > 0 ? VALOR_DIA_SEM_CHECKLIST : 100;
    }

    soma += conformidadeDia;
    if (conformidadeDia < 100) diasAbaixo100++;

    if (!preenchido) {
      perdaPorDiaNaoPreenchido += 100 - conformidadeDia;
    } else if (conformidadeDia < 100) {
      perdaPorPendencia += 100 - conformidadeDia;
    }

    dias.push({
      dia,
      data: `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
      preenchido,
      pesoTotalDoDia,
      pesoAtingido,
      // "100%" só quando o dia é REALMENTE perfeito. Sem o teto em 99, um dia
      // de 99,6% arredondava para 100 e aparecia verde no calendário enquanto
      // o card o contava em "Dias Abaixo de 100%" — as duas telas se
      // contradizendo de novo. Mesma proteção já usada na média do mês.
      conformidadeDia: conformidadeDia >= 100 ? 100 : Math.min(99, Math.round(conformidadeDia)),
      pendencias,
    });
  }

  // "100%" só pode aparecer quando o mês é REALMENTE perfeito (0 pendências).
  // Sem isso, um mês com pendências de peso pequeno pode arredondar pra "100%"
  // na tela e contradizer o card "Dias Abaixo de 100%" (que não arredonda).
  const mediaArredondadaPadrao = diasUteis > 0 ? Math.round(soma / diasUteis) : 0;
  const media =
    diasUteis === 0 ? 0 : diasAbaixo100 === 0 ? 100 : Math.min(99, mediaArredondadaPadrao);
  const diasPerfeitos = diasUteis - diasAbaixo100;
  const percentualPerfeitos = diasUteis > 0 ? Math.round((diasPerfeitos / diasUteis) * 100) : 0;

  return {
    media,
    diasUteis,
    diasPreenchidos,
    diasPendentes: diasUteis - diasPreenchidos,
    diasAbaixo100,
    diasPerfeitos,
    percentualPerfeitos,
    // Métrica oficial para a meta/bônus: % de dias perfeitos (0 tolerância a
    // pendência). A média ponderada (`media`) fica só como informação extra.
    bateuMeta: percentualPerfeitos >= META_CONFORMIDADE,
    // Dias que foram preenchidos mas tiveram alguma pendência (não são nem
    // "perfeitos" nem "não preenchidos") — usado para explicar a causa da
    // queda em dias, não em pontos percentuais.
    diasComPendencia: diasAbaixo100 - (diasUteis - diasPreenchidos),
    perdaPorDiaNaoPreenchido: Math.round(perdaPorDiaNaoPreenchido),
    perdaPorPendencia: Math.round(perdaPorPendencia),
    dias,
  };
}

// ─── PENDÊNCIAS POR FUNCIONÁRIO ───
//
// Acompanhamento individual por CONTAGEM de pendências, não por porcentagem.
// Porcentagem individual seria enganosa: o sistema não registra presença, então
// quem faltou/folgou/tirou férias terminaria o mês em 100% simplesmente por não
// poder ser marcado. Contagem não sofre disso.
//
// A nota do setor (métrica oficial do bônus) não é afetada por nada daqui.

export interface PendenciaAtribuida {
  dia: number;
  data: string; // YYYY-MM-DD
  popId: string;
  popTitulo: string;
  peso: number;
}

export interface ResumoPorPessoa {
  /** null quando a pendência não teve responsável indicado. */
  atendenteId: string | null;
  nome: string;
  /** true quando o id não existe mais no cadastro de funcionários. */
  removido: boolean;
  totalPendencias: number;
  pesoTotal: number;
  /** Em quantos dias distintos essas pendências aconteceram. Distingue
   * "um dia ruim" de "erro espalhado pelo mês" — a nota do setor conta DIAS,
   * então sem isso os dois números não se conversam. */
  diasDistintos: number;
  pendencias: PendenciaAtribuida[];
}

export const NOME_SEM_RESPONSAVEL = 'Sem responsável indicado';

// ─── FAIXAS DE PRÊMIO ───
//
// A perda é ESCALONADA de propósito: numa regra de tudo-ou-nada, quem cruza o
// limite no dia 10 fica sem nada a preservar nos outros 20 dias do mês.
// Em faixas, sempre sobra algo a perder — o esforço continua valendo até o fim.
//
// O sistema não conhece valores em dinheiro: devolve só a FATIA do prêmio que
// a pessoa mantém. O valor é aplicado por quem faz o fechamento.

export interface FaixasPremiacao {
  /** Até este peso acumulado, mantém o prêmio inteiro. */
  limiteIntegral: number;
  /** Até este peso, mantém 75%. */
  limite75: number;
  /** Até este peso, mantém 50%. Acima disso, perde tudo. */
  limite50: number;
}

// Calibrado sobre os 251 POPs reais da AGF (peso total 952, média 3,8).
// Quase metade deles tem peso 5, então o erro típico custa 5 — com os limites
// anteriores (2/5/9), dois deslizes no mês zeravam o prêmio, e um único erro
// no POP de peso 10 zerava sozinho. Aqui: até 2 erros típicos não custam nada,
// 7 ou mais zeram.
export const FAIXAS_PADRAO: FaixasPremiacao = {
  limiteIntegral: 10,
  limite75: 20,
  limite50: 30,
};

/** Fatia do prêmio pelas faixas, olhando só o peso acumulado. */
export function calcularFatiaPremio(pesoAcumulado: number, faixas: FaixasPremiacao): number {
  if (pesoAcumulado <= faixas.limiteIntegral) return 100;
  if (pesoAcumulado <= faixas.limite75) return 75;
  if (pesoAcumulado <= faixas.limite50) return 50;
  return 0;
}

/**
 * Fatia final da pessoa, já considerando o resultado do setor.
 *
 * Regra: **se o setor bateu a meta, o time inteiro recebe integral** — ninguém
 * é descontado num mês em que o time entregou. A conta individual só entra
 * quando o setor ficou abaixo da meta, que é o único momento em que alguém
 * que não errou estaria pagando pelo erro de outro.
 */
export function calcularFatiaFinal(
  pesoAcumulado: number,
  faixas: FaixasPremiacao,
  setorBateuMeta: boolean,
): number {
  if (setorBateuMeta) return 100;
  return calcularFatiaPremio(pesoAcumulado, faixas);
}

// ─── COMPARAÇÃO DE RÉGUAS ───
//
// Ferramenta de decisão: mostra o MESMO mês sob réguas diferentes, sem alterar
// nada. A régua oficial hoje é zero tolerância (`percentualPerfeitos`), em que
// uma pendência de peso 1 derruba o dia inteiro — é o que faz o erro
// concentrado de uma pessoa arrastar o time todo.

export type ChaveRegua = 'zero' | 'tolerancia90' | 'tolerancia80' | 'media';

export interface ResultadoRegua {
  chave: ChaveRegua;
  nome: string;
  descricao: string;
  nota: number;
  bateu: boolean;
  /** Dias que a régua considera aprovados (não se aplica à média ponderada). */
  diasAprovados: number | null;
}

/** Nota exata do dia (0–100), sem arredondamento. Dia sem POP exigível é neutro. */
function notaExataDoDia(d: DiaConformidade): number {
  if (d.pesoTotalDoDia <= 0) return 100;
  return (d.pesoAtingido / d.pesoTotalDoDia) * 100;
}

/**
 * Roda o mesmo mês sob cada régua candidata. Lê apenas o extrato dia a dia que
 * `calcularConformidade` já produz, então herda todas as regras de justiça
 * (domingo, dia futuro, criação do setor, POP por dia, POP desativado).
 *
 * Usa `pesoAtingido / pesoTotalDoDia` e não `conformidadeDia`, que é
 * arredondado — senão um dia de 89,6% contaria como 90% na faixa de tolerância.
 */
export function simularReguas(
  dias: DiaConformidade[],
  meta: number = META_CONFORMIDADE,
): ResultadoRegua[] {
  const total = dias.length;
  if (total === 0) {
    return [];
  }

  const notas = dias.map(notaExataDoDia);

  const contaAcima = (limite: number) => notas.filter((n) => n >= limite).length;
  const pct = (qtd: number) => Math.round((qtd / total) * 100);

  const perfeitos = contaAcima(100);
  const t90 = contaAcima(90);
  const t80 = contaAcima(80);
  const media = Math.round(notas.reduce((a, n) => a + n, 0) / total);

  return [
    {
      chave: 'zero',
      nome: 'Zero tolerância',
      descricao: 'Régua atual. O dia só vale se não teve nenhuma pendência.',
      nota: pct(perfeitos),
      bateu: pct(perfeitos) >= meta,
      diasAprovados: perfeitos,
    },
    {
      chave: 'tolerancia90',
      nome: 'Tolerância 90%',
      descricao: 'O dia vale se pelo menos 90% do peso do dia foi cumprido.',
      nota: pct(t90),
      bateu: pct(t90) >= meta,
      diasAprovados: t90,
    },
    {
      chave: 'tolerancia80',
      nome: 'Tolerância 80%',
      descricao: 'O dia vale se pelo menos 80% do peso do dia foi cumprido.',
      nota: pct(t80),
      bateu: pct(t80) >= meta,
      diasAprovados: t80,
    },
    {
      chave: 'media',
      nome: 'Média por peso',
      descricao: 'Média das notas diárias. É a régua mais tolerante das quatro.',
      nota: media,
      bateu: media >= meta,
      diasAprovados: null,
    },
  ];
}

// ─── CONCENTRAÇÃO ───

export interface Concentracao {
  /** Dias úteis que ficaram abaixo de 100%. */
  diasPerdidos: number;
  /** Desses, quantos tiveram uma única pessoa como responsável por tudo. */
  diasComResponsavelUnico: number;
  /** Dias perdidos sem nenhum responsável apontado (inclui dia não preenchido). */
  diasSemResponsavel: number;
  porPessoa: { atendenteId: string; nome: string; diasSozinho: number }[];
}

/**
 * Responde "o setor perdeu 6 dias, 5 deles só a Maria" — o número que sustenta
 * a decisão de poupar ou não o time quando o erro é concentrado numa pessoa.
 *
 * Só conta como concentrado o dia em que TODAS as pendências foram atribuídas
 * à mesma pessoa. Dia com dois responsáveis não é problema de um indivíduo.
 */
export function analisarConcentracao(
  dias: DiaConformidade[],
  atendentes: { id: string; nome: string }[],
): Concentracao {
  const nomePorId = new Map(atendentes.map((a) => [a.id, a.nome]));
  const diasSozinhoPorId = new Map<string, number>();

  let diasPerdidos = 0;
  let diasComResponsavelUnico = 0;
  let diasSemResponsavel = 0;

  for (const d of dias) {
    const perdeu = d.pesoTotalDoDia > 0 && d.pesoAtingido < d.pesoTotalDoDia;
    if (!perdeu) continue;
    diasPerdidos++;

    // Dia não preenchido não tem pendências listadas, logo não tem responsável.
    if (d.pendencias.length === 0) {
      diasSemResponsavel++;
      continue;
    }

    // Junta todos os apontados do dia: o dia só é "de uma pessoa" quando o
    // conjunto inteiro se resume a ela, mesmo que alguma pendência tenha
    // sido dividida entre dois nomes.
    const responsaveis = new Set(d.pendencias.flatMap((p) => p.responsaveisIds));
    if (responsaveis.size === 0) {
      diasSemResponsavel++;
      continue;
    }
    if (responsaveis.size === 1) {
      const [unico] = [...responsaveis];
      diasComResponsavelUnico++;
      diasSozinhoPorId.set(unico, (diasSozinhoPorId.get(unico) ?? 0) + 1);
    }
  }

  const porPessoa = [...diasSozinhoPorId.entries()]
    .map(([atendenteId, diasSozinho]) => ({
      atendenteId,
      nome: nomePorId.get(atendenteId) ?? `Funcionário removido (${atendenteId.slice(0, 8)})`,
      diasSozinho,
    }))
    .sort((a, b) => b.diasSozinho - a.diasSozinho || a.nome.localeCompare(b.nome));

  return { diasPerdidos, diasComResponsavelUnico, diasSemResponsavel, porPessoa };
}

/**
 * Agrupa as pendências do mês por funcionário, a partir do extrato dia a dia
 * que `calcularConformidade` já produz — herdando de graça todas as regras de
 * justiça (pula domingo, dia futuro, dias anteriores à criação do setor, e o
 * filtro de POP por dia) sem duplicar o laço.
 *
 * Retorna apenas quem teve pelo menos uma pendência (o cadastro de Atendente é
 * global, então listar todo mundo traria gente de outros setores), mais dois
 * baldes para nada sumir da conta: "sem responsável indicado" e funcionários
 * que foram excluídos do cadastro depois de já terem pendências registradas.
 */
export function calcularPendenciasPorPessoa(
  dias: DiaConformidade[],
  atendentes: { id: string; nome: string }[],
): ResumoPorPessoa[] {
  const nomePorId = new Map(atendentes.map((a) => [a.id, a.nome]));
  const grupos = new Map<string, ResumoPorPessoa>();

  for (const d of dias) {
    for (const p of d.pendencias) {
      // Uma pendência pode ter mais de um apontado: cada um carrega o peso
      // cheio. Por isso a soma das pessoas passa a ser MAIOR que o total de
      // pendências do setor — e isso é intencional, não erro de conta.
      const alvos: (string | null)[] = p.responsaveisIds.length > 0 ? p.responsaveisIds : [null];

      for (const id of alvos) {
      const chave = id ?? '__sem_responsavel__';

      let grupo = grupos.get(chave);
      if (!grupo) {
        const nomeCadastrado = id ? nomePorId.get(id) : undefined;
        grupo = {
          atendenteId: id,
          nome: id
            ? // O JSON não tem chave estrangeira: se o funcionário foi excluído
              // do cadastro, a pendência não pode simplesmente sumir da conta.
              (nomeCadastrado ?? `Funcionário removido (${id.slice(0, 8)})`)
            : NOME_SEM_RESPONSAVEL,
          removido: !!id && nomeCadastrado === undefined,
          totalPendencias: 0,
          pesoTotal: 0,
          diasDistintos: 0,
          pendencias: [],
        };
        grupos.set(chave, grupo);
      }

        grupo.totalPendencias++;
        grupo.pesoTotal += p.peso;
        grupo.pendencias.push({
          dia: d.dia,
          data: d.data,
          popId: p.id,
          popTitulo: p.titulo,
          peso: p.peso,
        });
      }
    }
  }

  for (const g of grupos.values()) {
    g.diasDistintos = new Set(g.pendencias.map((p) => p.data)).size;
  }

  return [...grupos.values()].sort((a, b) => {
    // O balde "sem responsável" não é uma pessoa — fica sempre por último.
    if (a.atendenteId === null) return 1;
    if (b.atendenteId === null) return -1;
    if (b.totalPendencias !== a.totalPendencias) return b.totalPendencias - a.totalPendencias;
    if (b.pesoTotal !== a.pesoTotal) return b.pesoTotal - a.pesoTotal;
    return a.nome.localeCompare(b.nome);
  });
}
