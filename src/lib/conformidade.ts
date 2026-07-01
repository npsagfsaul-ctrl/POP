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
// Métrica oficial da meta/bônus: `percentualPerfeitos` (dias 100% ÷ dias
// úteis) — qualquer pendência, por menor que seja, tira o dia de "perfeito".
// `media` (ponderada pelo peso) é só informativa/secundária.

export interface PopPeso {
  id: string;
  peso: number;
  titulo: string;
  createdAt: Date | string;
}

export interface RegistroConformidade {
  data: Date | string;
  respostas: Record<string, boolean> | unknown;
}

/** Dia útil (passado) sem checklist preenchido conta como este valor de conformidade. */
export const VALOR_DIA_SEM_CHECKLIST = 0;

/** Meta de conformidade usada para o bônus/remuneração. */
export const META_CONFORMIDADE = 80;

export interface PendenciaDia {
  id: string;
  titulo: string;
  peso: number;
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
  const limite = new Date(hoje);
  limite.setHours(0, 0, 0, 0);

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

    diasUteis++;

    // Apenas POPs que já existiam até o fim deste dia entram no cálculo do dia
    // (evita que um POP criado no meio do mês penalize dias anteriores à sua criação).
    const popsDoDia = pops.filter((pop) => new Date(pop.createdAt).getTime() <= fimDia.getTime());
    const pesoTotalDoDia = popsDoDia.reduce((acc, p) => acc + p.peso, 0);

    const reg = registrosPorDia.get(dia);
    const preenchido = !!reg;
    let pesoAtingido = 0;
    const pendencias: PendenciaDia[] = [];
    let conformidadeDia: number;

    if (preenchido) {
      const respostas = reg!.respostas as Record<string, boolean>;
      popsDoDia.forEach((pop) => {
        if (respostas && respostas[pop.id] === true) {
          pesoAtingido += pop.peso;
        } else if (pesoTotalDoDia > 0) {
          pendencias.push({ id: pop.id, titulo: pop.titulo, peso: pop.peso });
        }
      });
      conformidadeDia = pesoTotalDoDia > 0 ? (pesoAtingido / pesoTotalDoDia) * 100 : 100;
      diasPreenchidos++;
    } else {
      // Nenhum POP ainda exigível neste dia (setor criado mas sem POPs cadastrados
      // ainda) — não há o que falhar, conta como neutro (100%).
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
      conformidadeDia: Math.round(conformidadeDia),
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
