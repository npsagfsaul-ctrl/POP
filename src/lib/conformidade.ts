// Cálculo único de conformidade, compartilhado entre o card do setor,
// o rodapé do calendário e o relatório do admin — para que todos
// mostrem sempre o mesmo número.
//
// Regra (definida com o usuário):
// - Considera os DIAS ÚTEIS (Seg–Sáb) do mês, do dia 1 até hoje
//   (dias futuros do mês corrente NÃO entram na conta).
// - Dia útil COM checklist: conformidade = pesoAtingido / pesoTotal,
//   onde respostas[popId] === true significa "conforme".
// - Dia útil SEM checklist: conta como META_DIA_VAZIO (80%).

export interface PopPeso {
  id: string;
  peso: number;
}

export interface RegistroConformidade {
  data: Date | string;
  respostas: Record<string, boolean> | unknown;
}

/** Dia útil sem checklist preenchido conta como este valor (= meta de qualidade). */
export const META_DIA_VAZIO = 80;

export interface ResultadoConformidade {
  /** Média final arredondada (0–100). */
  media: number;
  /** Dias úteis considerados (Seg–Sáb, do dia 1 até hoje). */
  diasUteis: number;
  /** Dias úteis que tiveram checklist preenchido. */
  diasPreenchidos: number;
  /** Dias úteis sem checklist (pendências). */
  diasPendentes: number;
  /** Dias úteis com conformidade abaixo de 100% (inclui os sem checklist). */
  diasAbaixo100: number;
}

export function calcularConformidade(
  pops: PopPeso[],
  registros: RegistroConformidade[],
  mes: number, // 1–12
  ano: number,
  hoje: Date = new Date(),
): ResultadoConformidade {
  const pesoTotal = pops.reduce((acc, p) => acc + p.peso, 0);

  // Mapeia registros pelo dia do mês (data é @db.Date = meia-noite UTC).
  const registrosPorDia = new Map<number, RegistroConformidade>();
  registros.forEach((reg) => {
    registrosPorDia.set(new Date(reg.data).getUTCDate(), reg);
  });

  const diasNoMes = new Date(ano, mes, 0).getDate();
  const limite = new Date(hoje);
  limite.setHours(0, 0, 0, 0);

  let soma = 0;
  let diasUteis = 0;
  let diasPreenchidos = 0;
  let diasAbaixo100 = 0;

  for (let dia = 1; dia <= diasNoMes; dia++) {
    const dataDia = new Date(
      `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}T00:00:00`,
    );

    if (dataDia.getDay() === 0) continue; // pula domingo
    if (dataDia > limite) continue; // ignora dias futuros

    diasUteis++;

    const reg = registrosPorDia.get(dia);
    let conformidade: number;

    if (reg) {
      const respostas = reg.respostas as Record<string, boolean>;
      let pesoAtingido = 0;
      pops.forEach((pop) => {
        if (respostas && respostas[pop.id] === true) pesoAtingido += pop.peso;
      });
      conformidade = pesoTotal > 0 ? (pesoAtingido / pesoTotal) * 100 : 0;
      diasPreenchidos++;
    } else {
      conformidade = META_DIA_VAZIO;
    }

    soma += conformidade;
    if (conformidade < 100) diasAbaixo100++;
  }

  const media = diasUteis > 0 ? Math.round(soma / diasUteis) : 0;

  return {
    media,
    diasUteis,
    diasPreenchidos,
    diasPendentes: diasUteis - diasPreenchidos,
    diasAbaixo100,
  };
}
