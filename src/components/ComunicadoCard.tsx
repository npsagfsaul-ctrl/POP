import { Comunicado } from '@prisma/client';

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

export default function ComunicadoCard({ comunicado }: { comunicado: Comunicado }) {
  const config = tipoConfig[comunicado.tipo];

  return (
    <div className={`comunicado-card ${config.className} ${comunicado.destaque ? 'comunicado-destaque' : ''}`}>
      <div className="comunicado-card-header">
        <span className={`badge ${config.badgeClass}`}>{config.label}</span>
        {comunicado.destaque && (
          <span className="badge-destaque">📌 Fixado</span>
        )}
        <span className="comunicado-data">{formatarData(comunicado.createdAt)}</span>
      </div>
      <h3 className="comunicado-titulo">{comunicado.titulo}</h3>
      <p className="comunicado-conteudo">{comunicado.conteudo}</p>
    </div>
  );
}
