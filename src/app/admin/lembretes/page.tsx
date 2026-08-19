import { redirect } from 'next/navigation';

// Ver o comentário em /admin/comunicados/page.tsx.
export default function LembretesAdminPage() {
  redirect('/admin/avisos?aba=lembretes');
}
