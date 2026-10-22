import { NextResponse } from 'next/server';
import { criarCliente, atualizarCliente } from '@/actions/clientes';

export const dynamic = 'force-dynamic';

/**
 * Salvar cliente por uma rota de API, e não por Server Action.
 *
 * O motivo é poder LER o erro. O Next apaga a mensagem de qualquer falha numa
 * Server Action em produção e devolve um parágrafo genérico em inglês — e,
 * pior, uma falha no re-render que ele faz junto com a resposta derruba a
 * chamada inteira, mesmo quando a gravação deu certo. Dias de tentativa e erro
 * no cadastro de cliente foram exatamente isso: a tela dizia "deu erro" sem
 * nunca dizer qual.
 *
 * Uma rota de API devolve JSON comum. O erro chega inteiro na tela, com nome e
 * mensagem, e dá para consertar o que está escrito em vez de adivinhar.
 */
export async function POST(req: Request) {
  try {
    const fd = await req.formData();
    const id = (fd.get('__id') as string) || '';

    const r = id ? await atualizarCliente(id, fd) : await criarCliente(fd);
    if (r.erro) return NextResponse.json({ erro: r.erro }, { status: 400 });

    return NextResponse.json({ id: r.id });
  } catch (e) {
    // Aqui chega o que nem a action conseguiu tratar — a causa que estava
    // escondida. Vai inteira para a tela de propósito: é sistema interno, e
    // sem a mensagem não há conserto.
    const detalhe =
      e instanceof Error ? `${e.name}: ${e.message}` : `Erro desconhecido: ${String(e)}`;
    return NextResponse.json({ erro: detalhe }, { status: 500 });
  }
}
