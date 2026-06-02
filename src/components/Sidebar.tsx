'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSetorById } from '@/actions/setores';

interface SidebarProps {
  isAdmin: boolean;
}

const IconHome = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const IconClipboard = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

const IconCog = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const IconPlus = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const IconLock = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

export default function Sidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const [setorNome, setSetorNome] = useState<string | null>(null);

  useEffect(() => {
    const match = pathname.match(/^\/setores\/([^/]+)/);
    if (match && match[1] !== 'novo') {
      getSetorById(match[1]).then(setor => {
        if (setor) setSetorNome(setor.nome);
      });
    } else {
      setSetorNome(null);
    }
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <div>
          <div className="sidebar-logo-text">Gestão POPs</div>
          <div className="sidebar-logo-sub">Sistema de Procedimentos</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Principal</div>

        <Link href="/" className={`sidebar-link ${isActive('/') ? 'active' : ''}`}>
          <IconHome />
          Setores
        </Link>

        {isAdmin && (
          <>
            <div className="sidebar-section-label" style={{ marginTop: 12 }}>Administração</div>

            <Link href="/setores/novo" className={`sidebar-link ${isActive('/setores/novo') ? 'active' : ''}`}>
              <IconPlus />
              Novo Setor
            </Link>

            <Link href="/pops/novo" className={`sidebar-link ${isActive('/pops/novo') ? 'active' : ''}`}>
              <IconPlus />
              Novo POP
            </Link>

            <Link href="/admin/login" className="sidebar-link">
              <IconCog />
              Configurações
            </Link>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {isAdmin ? 'A' : 'U'}
          </div>
          <div>
            <div className="sidebar-user-name">
              {isAdmin ? 'Administrador' : (setorNome ? `Usuário do ${setorNome}` : 'Usuário')}
            </div>
            <div className="sidebar-user-role">{isAdmin ? 'Acesso total' : 'Somente leitura'}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
