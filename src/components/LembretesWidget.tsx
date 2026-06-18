import { Lembrete } from '@prisma/client';

function diasParaData(data: Date): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(data);
  alvo.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

function formatarData(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(date));
}

export default function LembretesWidget({ lembretes }: { lembretes: Lembrete[] }) {
  if (lembretes.length === 0) {
    return (
      <div className="card">
        <div className="card-title">📅 Lembretes</div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
          Nenhum lembrete nos próximos 30 dias.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title">📅 Lembretes</div>
      <div className="lembretes-lista">
        {lembretes.map((lembrete) => {
          const dias = diasParaData(lembrete.data);
          const urgente = dias <= 3;
          const hoje = dias === 0;

          return (
            <div key={lembrete.id} className={`lembrete-item ${urgente ? 'lembrete-urgente' : ''}`}>
              <div className="lembrete-data-badge">
                {hoje ? (
                  <span className="badge badge-danger">Hoje</span>
                ) : (
                  <span className={`badge ${urgente ? 'badge-warning' : 'badge-info'}`}>
                    {formatarData(lembrete.data)}
                  </span>
                )}
              </div>
              <div className="lembrete-info">
                <div className="lembrete-titulo">{lembrete.titulo}</div>
                {lembrete.descricao && (
                  <div className="lembrete-desc">{lembrete.descricao}</div>
                )}
                <div className="lembrete-dias">
                  {hoje ? 'É hoje!' : `em ${dias} dia${dias !== 1 ? 's' : ''}`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
