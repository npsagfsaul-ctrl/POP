import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit carrega as fontes (.afm) do disco em tempo de execução; o
  // rastreador de arquivos da Vercel não detecta isso sozinho e a função
  // quebra com ENOENT em produção. Força a inclusão desses arquivos.
  outputFileTracingIncludes: {
    "/api/relatorio/pdf": ["./node_modules/pdfkit/js/data/**"],
    "/api/pops/export/pdf": ["./node_modules/pdfkit/js/data/**"],
  },
};

export default nextConfig;
