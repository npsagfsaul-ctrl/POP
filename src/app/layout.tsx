import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistema de POPs",
  description: "Gerenciamento de Procedimentos Operacionais Padrão",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <header className="header">
          <div className="container header-content">
            <Link href="/" className="header-logo">
              Gestão de POPs
            </Link>
            <nav className="nav-links">
              <Link href="/setores/novo" className="btn btn-secondary">
                Novo Setor
              </Link>
              <Link href="/pops/novo" className="btn btn-primary">
                Novo POP
              </Link>
            </nav>
          </div>
        </header>
        <main className="container">
          {children}
        </main>
      </body>
    </html>
  );
}
