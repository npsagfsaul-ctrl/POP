import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getClientePorId } from '@/actions/clientes';
import ClienteForm from '@/components/ClienteForm';
import { nivelComercial } from '@/actions/comercialAcesso';
import { portaoComercial } from '../portao';

export const dynamic = 'force-dynamic';

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const fechado = await portaoComercial();
  if (fechado) return fechado;

  const { id } = await params;

  /**
   * Mostra o erro em vez de deixar a página cair.
   *
   * Em produção o Next troca qualquer erro de render por um parágrafo genérico
   * em inglês, que não diz nada a quem está usando nem a quem vai consertar.
   * Preferimos a ficha abrir com a mensagem de verdade escrita nela.
   */
  let cliente: Awaited<ReturnType<typeof getClientePorId>>;
  try {
    cliente = await getClientePorId(id);
  } catch (e) {
    return (
      <div className="alert alert-danger">
        <strong>Não foi possível abrir esta ficha.</strong>
        <p style={{ margin: '8px 0 0' }}>
          {e instanceof Error ? e.message : 'Erro desconhecido.'}
        </p>
        <p style={{ margin: '8px 0 0' }}>
          <Link href="/comercial" style={{ textDecoration: 'underline' }}>Voltar para a lista</Link>
        </p>
      </div>
    );
  }

  if (!cliente) notFound();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{cliente.nome}</h1>
          <nav className="breadcrumb">
            <Link href="/comercial" className="breadcrumb-link">Comercial</Link>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">{cliente.nomeFantasia || cliente.nome}</span>
          </nav>
        </div>
      </div>

      <ClienteForm
        somenteLeitura={(await nivelComercial()) !== 'editar'}
        cliente={{
          id: cliente.id,
          nome: cliente.nome,
          tipo: cliente.tipo,
          codigo: cliente.codigo,
          nomeFantasia: cliente.nomeFantasia,
          documento: cliente.documento,
          inscricaoEstadual: cliente.inscricaoEstadual,
          idsCorreios: cliente.idsCorreios,
          responsavel: cliente.responsavel,
          cpfResponsavel: cliente.cpfResponsavel,
          rgResponsavel: cliente.rgResponsavel,
          nascimentoResponsavel: cliente.nascimentoResponsavel,
          nomeMaeResponsavel: cliente.nomeMaeResponsavel,
          contatoNome: cliente.contatoNome,
          telefone: cliente.telefone,
          email: cliente.email,
          cep: cliente.cep,
          rua: cliente.rua,
          numero: cliente.numero,
          complemento: cliente.complemento,
          bairro: cliente.bairro,
          cidade: cliente.cidade,
          uf: cliente.uf,
          observacao: cliente.observacao,
          anexos: cliente.anexos,
          ativo: cliente.ativo,
        }}
      />
    </div>
  );
}
