import { redirect } from 'next/navigation';

// As três telas de aviso viraram abas de /admin/avisos. A rota antiga continua
// existindo para não quebrar link salvo ou favorito de ninguém.
export default function ComunicadosAdminPage() {
  redirect('/admin/avisos?aba=comunicados');
}
