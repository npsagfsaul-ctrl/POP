import PasswordPrompt from '@/components/PasswordPrompt';
import { podeUsarComercial, getSetorComercial, comercialSemSenha } from '@/actions/comercialAcesso';

/**
 * O que mostrar quando a pessoa não pode entrar no Comercial — ou `null`,
 * quando pode.
 *
 * Fica num lugar só porque são três telas com a mesma porta: lista, cadastro e
 * ficha. Uma delas esquecer a checagem seria mostrar a senha dos IDs Correios
 * para quem passar pela URL direto.
 */
export async function portaoComercial() {
  if (await podeUsarComercial()) return null;

  const setor = await getSetorComercial();
  if (!setor) {
    return (
      <div className="alert alert-info">
        A área Comercial ainda não foi ligada a um setor. Peça ao administrador
        para criar o setor Comercial.
      </div>
    );
  }

  if (await comercialSemSenha()) {
    return (
      <div className="alert alert-warning">
        <strong>O setor {setor.nome} ainda está sem senha.</strong>
        <p style={{ margin: '8px 0 0' }}>
          Esta área guarda a senha do ID Correios dos clientes, então ela só abre
          com senha. O administrador cadastra a senha do setor em Configurações,
          e aí o pessoal do Comercial entra com ela.
        </p>
      </div>
    );
  }

  return <PasswordPrompt setorId={setor.id} setorNome={setor.nome} />;
}
