import { coletasLiberado } from '@/actions/coletasAcesso';
import ColetasPasswordPrompt from '@/components/ColetasPasswordPrompt';
import { getColetores } from '@/actions/coletores';
import { getVeiculos } from '@/actions/veiculos';
import { getColetorAtual } from '@/actions/coletorSessao';
import { getTurnoAberto } from '@/actions/turnos';
import { getMinhasColetasHoje } from '@/actions/coletas';
import ColetorMotoristaApp from '@/components/ColetorMotoristaApp';
import { hojeISOSaoPaulo } from '@/lib/data';

export const dynamic = 'force-dynamic';

const hojeISO = hojeISOSaoPaulo;

function horaBR(d: Date) {
  return new Date(d).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

export default async function MotoristaPage() {
  if (!(await coletasLiberado())) {
    return <ColetasPasswordPrompt />;
  }

  const [coletores, veiculos, coletorAtual] = await Promise.all([
    getColetores(true),
    getVeiculos(true),
    getColetorAtual(),
  ]);

  const dataStr = hojeISO();
  const turnoAberto = coletorAtual ? await getTurnoAberto(coletorAtual.id) : null;
  const coletasHoje = coletorAtual ? await getMinhasColetasHoje(coletorAtual.id, dataStr) : [];

  return (
    <ColetorMotoristaApp
      coletores={coletores.map((c) => ({ id: c.id, nome: c.nome, cor: c.cor }))}
      veiculos={veiculos.map((v) => ({ id: v.id, nome: v.nome, placa: v.placa }))}
      coletorAtual={coletorAtual ? { id: coletorAtual.id, nome: coletorAtual.nome, cor: coletorAtual.cor } : null}
      turnoAberto={
        turnoAberto
          ? {
              id: turnoAberto.id,
              veiculoNome: turnoAberto.veiculo.nome,
              kmInicial: turnoAberto.kmInicial,
              liberadoEm: horaBR(turnoAberto.liberadoEm),
            }
          : null
      }
      coletasHoje={coletasHoje.map((c) => ({
        id: c.id,
        periodo: c.periodo,
        status: c.status,
        horaColeta: c.horaColeta ? horaBR(c.horaColeta) : null,
        rotaNome: c.rotaFixa?.rota?.nome ?? null,
        observacao: c.observacao,
        naoTeveColeta: c.naoTeveColeta,
        clienteNome: c.cliente.nome,
        clienteCodigo: c.cliente.codigo,
      }))}
    />
  );
}
