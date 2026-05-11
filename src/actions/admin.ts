'use server';

import { cookies } from 'next/headers';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

export async function loginAdmin(password: string) {
  if (password === ADMIN_PASSWORD) {
    const cookieStore = await cookies();
    cookieStore.set('auth_admin', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });
    return { success: true };
  }
  return { success: false, error: 'Senha incorreta' };
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete('auth_admin');
}

export async function isAdmin() {
  const cookieStore = await cookies();
  return cookieStore.has('auth_admin');
}
