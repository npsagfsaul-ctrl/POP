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
      <body className="antialiased bg-slate-950 text-slate-50 min-h-screen">
        <header className="header">
          <div className="container header-content">
            <Link href="/" className="header-logo hover:opacity-80 flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className="h-4 w-4 text-primary" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                </svg>
              </div>
              <span className="text-xl font-black tracking-tighter uppercase">Gestão de POPs</span>
            </Link>
            <nav className="nav-links flex items-center gap-4">
              <Link href="/" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-primary transition-colors hidden md:block">Sectores</Link>
              <Link href="/setores/novo" className="btn btn-secondary btn-sm border-white/5 bg-slate-900/50">
                Novo Setor
              </Link>
            </nav>
          </div>
        </header>
        <main className="container pb-20">
          {children}
        </main>
      </body>
    </html>
  );
}
