import { redirect } from 'next/navigation';

// Ver o comentário em /admin/comunicados/page.tsx.
export default function OcorrenciasAdminPage() {
  redirect('/admin/avisos?aba=ocorrencias');
}
