import React from 'react';
import Link from 'next/link';
import { PropsWithChildren } from 'react';

export default function AdminLayout({ children }: PropsWithChildren<{}>) {
  return (
    <div className="admin-layout" style={{ padding: '2rem', background: 'var(--background)' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontFamily: 'Inter, sans-serif', color: 'var(--text-main)' }}>Painel Administrador</h1>
        <Link
          href="/admin/relatorio"
          style={{
            background: 'teal',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          Gerar Relatório
        </Link>
      </header>
      <main>{children}</main>
    </div>
  );
}
