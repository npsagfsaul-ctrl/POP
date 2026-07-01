import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit carrega as fontes (.afm) do disco relativo à própria pasta dele
  // (node_modules/pdfkit/js/data). Se o Next.js empacota o pdfkit dentro de
  // um chunk (comportamento padrão), esse caminho relativo quebra e a função
  // falha com ENOENT em produção. serverExternalPackages mantém o pdfkit
  // fora do empacotamento, carregado via require() normal do node_modules.
  serverExternalPackages: ["pdfkit"],
  // Rede de segurança: garante que os arquivos de fonte do pdfkit sejam
  // incluídos no pacote da função serverless.
  outputFileTracingIncludes: {
    "/api/relatorio/pdf": ["./node_modules/pdfkit/js/data/**"],
    "/api/pops/export/pdf": ["./node_modules/pdfkit/js/data/**"],
  },
};

export default nextConfig;
