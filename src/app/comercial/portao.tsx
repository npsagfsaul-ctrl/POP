import ComercialLogin, { OpcaoEntrada } from '@/components/ComercialLogin';
import { nivelComercial, setoresDoComercial } from '@/actions/comercialAcesso';

/**
 * O que mostrar quando a pessoa ainda não entrou no Comercial — ou `null`,
 * quando já entrou.
 *
 * Fica num lugar só porque são três telas com a mesma porta: lista, cadastro e
 * ficha. Uma delas esquecer a checagem seria mostrar a senha dos IDs Correios
 * para quem passar pela URL direto.
 */
export async function portaoComercial() {
  if (await nivelComercial()) return null;

  const { comercial, leitura } = await setoresDoComercial();

  if (!comercial) {
    return (
      <div className="alert alert-info">
        A área Comercial ainda não foi ligada a um setor. Peça ao administrador
        para criar o setor Comercial.
      </div>
    );
  }

  if (!comercial.temSenha) {
    return (
      <div className="alert alert-warning">
        <strong>O setor {comercial.nome} ainda está sem senha.</strong>
        <p style={{ margin: '8px 0 0' }}>
          Esta área guarda a senha do ID Correios dos clientes, então ela só abre
          com senha. O administrador cadastra a senha do setor em Configurações,
          e aí o pessoal do Comercial entra com ela.
        </p>
      </div>
    );
  }

  // Setor sem senha cadastrada fica fora da lista: não dá para pedir uma senha
  // que não existe.
  const opcoes: OpcaoEntrada[] = [{ id: comercial.id, nome: comercial.nome, papel: 'editar' }];
  if (leitura?.temSenha && leitura.id !== comercial.id) {
    opcoes.push({ id: leitura.id, nome: leitura.nome, papel: 'ver' });
  }

  return <ComercialLogin opcoes={opcoes} />;
}
