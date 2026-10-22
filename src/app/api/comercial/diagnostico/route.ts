import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/actions/admin';
import { podeEditarComercial } from '@/actions/comercialAcesso';

export const dynamic = 'force-dynamic';

/**
 * Diagnóstico do cadastro de cliente, em texto puro.
 *
 * Existe porque o erro do cadastro vinha sempre apagado pelo Next, e nem a
 * pessoa que usa nem eu conseguíamos ver a causa. Aqui cada passo é tentado em
 * separado e o que falhar aparece escrito, com o nome e a mensagem do erro.
 *
 * O teste de gravação roda dentro de uma transação que SEMPRE desfaz no fim:
 * ele prova que o INSERT funciona sem deixar cliente de mentira no cadastro.
 *
 * Só o admin abre, e nenhuma senha ou token é impresso — só se existe ou não.
 */
class Desfazer extends Error {}

async function passo(nome: string, fn: () => Promise<string>): Promise<string> {
  try {
    return `OK    ${nome}: ${await fn()}`;
  } catch (e) {
    const erro = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    return `FALHA ${nome}\n      ${erro.replace(/\n/g, '\n      ')}`;
  }
}

export async function GET() {
  if (!(await isAdmin())) {
    return new NextResponse('Entre como Administrador para abrir o diagnóstico.', {
      status: 403,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const linhas: string[] = ['DIAGNÓSTICO — CADASTRO DE CLIENTE', ''];

  linhas.push(await passo('permissão do Comercial', async () =>
    (await podeEditarComercial()) ? 'pode editar' : 'NÃO pode editar — é isso que derruba o cadastro',
  ));

  linhas.push(await passo('ler tabela Cliente', async () =>
    `${await prisma.cliente.count()} clientes`,
  ));

  linhas.push(await passo('ler tabela IdCorreios', async () =>
    `${await prisma.idCorreios.count()} IDs`,
  ));

  linhas.push(await passo('ler tabela Anexo', async () =>
    `${await prisma.anexo.count()} anexos`,
  ));

  // O teste que importa: gravar um cliente com TODOS os campos que a tela
  // manda, e desfazer. Se alguma coluna faltar no banco, estoura aqui com o
  // nome dela.
  linhas.push(await passo('gravar cliente de teste (desfeito no fim)', async () => {
    try {
      await prisma.$transaction(async (tx) => {
        const c = await tx.cliente.create({
          data: {
            nome: 'TESTE DIAGNOSTICO', tipo: 'PJ', codigo: '000000',
            nomeFantasia: 'teste', documento: '00.000.000/0001-00',
            inscricaoEstadual: 'ISENTO',
            responsavel: 'teste', cpfResponsavel: '000.000.000-00',
            rgResponsavel: '0000000', nascimentoResponsavel: '1990-01-01',
            nomeMaeResponsavel: 'teste', contatoNome: 'teste',
            telefone: '(00) 00000-0000', email: 'teste@teste.com',
            cep: '00000-000', rua: 'teste', numero: '0', complemento: null,
            bairro: 'teste', cidade: 'teste', uf: 'PR', observacao: 'teste',
          },
        });
        await tx.idCorreios.create({
          data: { clienteId: c.id, numero: '0000000000', apelido: null, senha: 'x' },
        });
        throw new Desfazer();
      });
      return 'gravou (sem desfazer?)';
    } catch (e) {
      if (e instanceof Desfazer) return 'gravou e desfez — o INSERT funciona';
      throw e;
    }
  }));

  linhas.push('');
  linhas.push(`Vercel Blob configurado: ${process.env.BLOB_READ_WRITE_TOKEN ? 'sim' : 'NÃO'}`);
  linhas.push(`Banco configurado: ${process.env.DATABASE_URL ? 'sim' : 'NÃO'}`);

  return new NextResponse(linhas.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
