'use client';

import { logoutAdmin } from '@/actions/admin';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await logoutAdmin();
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="btn btn-secondary btn-sm"
      style={{ color: 'var(--danger)', borderColor: 'rgba(244,106,106,0.3)' }}
    >
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      Sair
    </button>
  );
}
