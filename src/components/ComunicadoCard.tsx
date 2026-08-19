import { Comunicado } from '@prisma/client';

/** Comunicado com o autor já carregado. `setor` nulo = publicado pela administração. */
export type ComunicadoComAutor = Comunicado & { setor?: { nome: string } | null };

const tipoConfig = {
  URGENTE: {
    label: '🚨 Urgente',
    className: 'comunicado-urgente',
    badgeClass: 'badge-danger',
  },
  AVISO: {
    label: '⚠️ Aviso',
    className: 'comunicado-aviso',
    badgeClass: 'badge-warning',
  },
  NOVIDADE: {
    label: '🆕 Novidade',
    className: 'comunicado-novidade',
    badgeClass: 'badge-primary',
  },
  INFO: {
    label: 'ℹ️ Informativo',
    className: 'comunicado-info',
    badgeClass: 'badge-info',
  },
};

function formatarData(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export default function ComunicadoCard({ comunicado }: { comunicado: ComunicadoComAutor }) {
  const config = tipoConfig[comunicado.tipo];
  const autor = comunicado.setor?.nome;

  return (
    <div className={`comunicado-card ${config.className} ${comunicado.destaque ? 'comunicado-destaque' : ''}`}>
      <div className="comunicado-card-header">
        {/* Quem falou vem primeiro: é o que muda como o recado é lido. */}
        {autor && <span className="badge badge-primary">🏷️ {autor}</span>}
        <span className={`badge ${config.badgeClass}`}>{config.label}</span>
        {comunicado.destaque && (
          <span className="badge-destaque">📌 Fixado</span>
        )}
        <span className="comunicado-data">{formatarData(comunicado.createdAt)}</span>
      </div>
      <h3 className="comunicado-titulo">{comunicado.titulo}</h3>
      <p className="comunicado-conteudo">{comunicado.conteudo}</p>
      {comunicado.imagem && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={comunicado.imagem}
          alt={`Imagem do informativo: ${comunicado.titulo}`}
          style={{
            marginTop: 12,
            maxWidth: '100%',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            display: 'block',
          }}
        />
      )}
    </div>
  );
}
