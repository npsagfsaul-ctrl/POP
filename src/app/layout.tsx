import type { Metadata } from "next";
import Link from "next/link";
import { isAdmin } from "@/actions/admin";
import { contarOcorrenciasAbertas } from "@/actions/ocorrencias";
import Sidebar from "@/components/Sidebar";
import LogoutButton from "@/components/LogoutButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal Correios | Sistema Interno",
  description: "Portal interno da agência — comunicados, lembretes, checklists e ocorrências",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const adminMode = await isAdmin();
  const ocorrenciasAbertas = adminMode ? await contarOcorrenciasAbertas() : 0;

  return (
    <html lang="pt-BR">
      <body>
        <div className="app-wrapper">
          <Sidebar isAdmin={adminMode} ocorrenciasAbertas={ocorrenciasAbertas} />

          <div className="main-content">
            {/* Topbar */}
            <header className="topbar">
              <div>
                <span className="topbar-title">Portal Correios</span>
              </div>

              <div className="topbar-actions">
                {adminMode ? (
                  <>
                    <Link
                      href="/setores/novo"
                      className="btn btn-primary btn-sm"
                    >
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Novo Setor
                    </Link>
                    <LogoutButton />
                  </>
                ) : (
                  <Link href="/admin/login" className="btn btn-outline btn-sm">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Login ADM
                  </Link>
                )}
              </div>
            </header>

            {/* Page Content */}
            <main className="page-content">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
