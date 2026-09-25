import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getClientePorId } from '@/actions/clientes';
import ClienteForm from '@/components/ClienteForm';
import { portaoComercial } from '../portao';

export const dynamic = 'force-dynamic';

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const fechado = await portaoComercial();
  if (fechado) return fechado;

  const { id } = await params;
  const cliente = await getClientePorId(id);
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
          ativo: cliente.ativo,
        }}
      />
    </div>
  );
}
