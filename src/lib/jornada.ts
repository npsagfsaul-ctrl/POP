import { parseHoras, formatarHoras } from './horas';

/**
 * A jornada contratada de um colaborador, em dois blocos.
 *
 * Dois blocos — "segunda a sexta" e "sábado" — e não sete dias soltos porque é
 * assim que a agência fala e escala: quem trabalha sábado faz um horário
 * diferente, e os dias de semana são iguais entre si. Sete dias separados
 * dariam 28 campos para preencher por pessoa, para quase sempre repetir o
 * mesmo horário cinco vezes.
 *
 * Cada bloco tem até dois períodos, por causa do intervalo do almoço:
 * 09:00–12:00 e 14:00–19:00.
 *
 * Isto é a jornada CONTRATADA, não o que foi trabalhado. Quem sabe o que foi
 * trabalhado é o sistema de ponto.
 */
export interface Periodo {
  entrada: string; // "09:00"
  saida: string;   // "12:00"
}

export interface Jornada {
  semana: Periodo[];
  sabado: Periodo[];
}

export const JORNADA_VAZIA: Jornada = { semana: [], sabado: [] };

/**
 * Minutos de um período. `null` quando os horários não dão um intervalo
 * válido — vazio, mal escrito, ou saída antes da entrada.
 *
 * Não trata virada de meia-noite: a agência não tem turno que atravesse o dia,
 * e adivinhar isso esconderia um erro de digitação (19:00 às 09:00 vira 14h em
 * vez de avisar que está trocado).
 */
export function minutosDoPeriodo(p: Periodo): number | null {
  const entrada = parseHoras(p.entrada ?? '');
  const saida = parseHoras(p.saida ?? '');
  if (entrada === null || saida === null) return null;
  if (entrada < 0 || saida < 0) return null;
  if (saida <= entrada) return null;
  return saida - entrada;
}

/** Soma os períodos de um bloco, ignorando os incompletos. */
export function minutosDoBloco(periodos: Periodo[]): number {
  return periodos.reduce((total, p) => total + (minutosDoPeriodo(p) ?? 0), 0);
}

/** A semana inteira: cinco dias de semana mais o sábado. */
export function minutosDaSemana(j: Jornada): number {
  return minutosDoBloco(j.semana) * 5 + minutosDoBloco(j.sabado);
}

/**
 * O resumo que aparece na lista: "44h · Seg a Sáb".
 * Vazio quando ninguém preencheu a jornada ainda.
 */
export function resumoJornada(j: Jornada | null): string {
  if (!j) return '';

  const semana = minutosDoBloco(j.semana);
  const sabado = minutosDoBloco(j.sabado);
  if (semana === 0 && sabado === 0) return '';

  const total = minutosDaSemana(j);
  const horas = Math.floor(total / 60);
  const min = total % 60;
  const carga = min === 0 ? `${horas}h` : `${horas}h${String(min).padStart(2, '0')}`;

  const dias = semana > 0 && sabado > 0 ? 'Seg a Sáb' : semana > 0 ? 'Seg a Sex' : 'Só sábado';
  return `${carga} · ${dias}`;
}

/** O total de um bloco escrito como no relatório do ponto: "08:00". */
export function formatarBloco(periodos: Periodo[]): string {
  return formatarHoras(minutosDoBloco(periodos));
}

/** Lê o que está gravado no banco, aceitando o que estiver pela metade. */
export function lerJornada(valor: unknown): Jornada | null {
  if (!valor || typeof valor !== 'object') return null;
  const v = valor as Record<string, unknown>;

  const bloco = (x: unknown): Periodo[] =>
    Array.isArray(x)
      ? x
          .filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
          .map((p) => ({ entrada: String(p.entrada ?? ''), saida: String(p.saida ?? '') }))
      : [];

  return { semana: bloco(v.semana), sabado: bloco(v.sabado) };
}
