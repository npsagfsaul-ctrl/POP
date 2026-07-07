'use client';

export default function SidebarToggle() {
  return (
    <button
      type="button"
      className="sidebar-toggle-btn"
      aria-label="Abrir menu"
      onClick={() => window.dispatchEvent(new Event('toggle-sidebar'))}
    >
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}
