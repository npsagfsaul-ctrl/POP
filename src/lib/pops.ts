// A numeração dos POPs é da usuária, não do sistema: ela digita o número no
// próprio título ("21. Conferir malote", "24 - Postagem até o horário").
// O sistema não deve numerar por cima disso — nem ignorar essa ordem.

/** Número digitado no início do título ("21. Algo" ou "24 - Algo" → 21 / 24). */
export function numeroDoTitulo(titulo: string): number | null {
  // Exige um separador depois dos dígitos, senão "5S na bancada" viraria 5.
  const m = titulo.trim().match(/^(\d+)\s*[.\-–)]\s/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Ordena seguindo a numeração do título. Quem não tem número vai para o fim,
 * na ordem de cadastro — assim a lista impressa sai na sequência que a pessoa
 * definiu, e não na ordem em que os POPs foram digitados no sistema.
 */
export function ordenarPops<T extends { titulo: string; createdAt: Date | string }>(pops: T[]): T[] {
  return [...pops].sort((a, b) => {
    const na = numeroDoTitulo(a.titulo);
    const nb = numeroDoTitulo(b.titulo);
    if (na !== null && nb !== null) return na - nb;
    if (na !== null) return -1;
    if (nb !== null) return 1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}
