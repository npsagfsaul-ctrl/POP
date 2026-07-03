/**
 * Normaliza quebras de linha (\r\n ou \r solto, comuns em texto colado do
 * Windows/Word) para \n. Sem isso, o pdfkit renderiza o caractere \r como um
 * glifo inválido ("Ð") e o CSV pode ficar com células quebradas no Excel.
 */
export function normalizarQuebrasDeLinha(texto: string): string {
  return texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}
