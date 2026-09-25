'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { criarCliente, atualizarCliente, alternarClienteAtivo, deletarCliente } from '@/actions/clientes';

export interface ClienteFormDados {
  id: string;
  nome: string;
  tipo: 'PJ' | 'PF';
  codigo: string | null;
  nomeFantasia: string | null;
  documento: string | null;
  inscricaoEstadual: string | null;
  idsCorreios: { numero: string; apelido: string | null; senha: string | null }[];
  responsavel: string | null;
  cpfResponsavel: string | null;
  rgResponsavel: string | null;
  nascimentoResponsavel: string | null;
  nomeMaeResponsavel: string | null;
  contatoNome: string | null;
  telefone: string | null;
  email: string | null;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  observacao: string | null;
  ativo: boolean;
}

interface Props {
  /** Ausente = cadastro novo. */
  cliente?: ClienteFormDados;
  /** Atendimento Interno: consulta a ficha, não altera. */
  somenteLeitura?: boolean;
}

interface LinhaId {
  numero: string;
  apelido: string;
  senha: string;
}

const LINHA_ID_VAZIA: LinhaId = { numero: '', apelido: '', senha: '' };

/** Uma linha do formulário, com as colunas em proporção. */
function Linha({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 4 }}>{children}</div>
  );
}

function Campo({
  label,
  name,
  defaultValue,
  placeholder,
  largura = 1,
  tipo = 'text',
  obrigatorio = false,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  largura?: number;
  tipo?: string;
  obrigatorio?: boolean;
  hint?: string;
}) {
  return (
    <div className="form-group" style={{ flex: `${largura} 1 ${largura * 140}px`, marginBottom: 16 }}>
      <label className="form-label" htmlFor={name}>
        {label} {obrigatorio && <span style={{ color: 'var(--danger)' }}>*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={tipo}
        className="form-input"
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        required={obrigatorio}
        autoComplete="off"
      />
      {hint && <div className="form-hint">{hint}</div>}
    </div>
  );
}

/**
 * Cada bloco é um `fieldset`: marcado como desabilitado, ele desliga todos os
 * campos de dentro de uma vez, sem precisar repetir `disabled` em cada um.
 */
function Bloco({
  titulo,
  desabilitado,
  children,
}: {
  titulo: string;
  desabilitado: boolean;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="card" disabled={desabilitado} style={{ marginBottom: 20 }}>
      <div className="card-title">{titulo}</div>
      {children}
    </fieldset>
  );
}

export default function ClienteForm({ cliente, somenteLeitura = false }: Props) {
  const router = useRouter();
  const editando = !!cliente;

  const [tipo, setTipo] = useState<'PJ' | 'PF'>(cliente?.tipo ?? 'PJ');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Uma linha em branco quando não há nenhum ID, só para a pessoa ver onde
  // digitar. Linha vazia é descartada ao salvar.
  const [ids, setIds] = useState<LinhaId[]>(
    cliente?.idsCorreios.length
      ? cliente.idsCorreios.map((i) => ({
          numero: i.numero,
          apelido: i.apelido ?? '',
          senha: i.senha ?? '',
        }))
      : [LINHA_ID_VAZIA],
  );

  // Senha escondida por padrão: a ficha costuma ser aberta com alguém do lado.
  const [mostrarSenhas, setMostrarSenhas] = useState(false);

  const pessoaJuridica = tipo === 'PJ';

  function trocarId(indice: number, campo: keyof LinhaId, valor: string) {
    setIds((atual) => atual.map((l, i) => (i === indice ? { ...l, [campo]: valor } : l)));
  }

  function adicionarId() {
    setIds((atual) => [...atual, LINHA_ID_VAZIA]);
  }

  function removerId(indice: number) {
    // Nunca fica sem nenhuma linha: sem campo na tela, não dá para cadastrar o
    // primeiro ID sem antes descobrir o botão de adicionar.
    setIds((atual) => (atual.length === 1 ? [LINHA_ID_VAZIA] : atual.filter((_, i) => i !== indice)));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErro(null);
    setSalvando(true);
    try {
      if (cliente) {
        await atualizarCliente(cliente.id, fd);
        router.push('/comercial');
      } else {
        await criarCliente(fd);
        router.push('/comercial');
      }
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar.');
      setSalvando(false);
    }
  }

  async function handleAtivo() {
    if (!cliente) return;
    setErro(null);
    try {
      await alternarClienteAtivo(cliente.id, !cliente.ativo);
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível alterar.');
    }
  }

  async function handleExcluir() {
    if (!cliente) return;
    if (!confirm(`Excluir ${cliente.nome} do cadastro? Isso não pode ser desfeito.`)) return;
    setErro(null);
    try {
      await deletarCliente(cliente.id);
      router.push('/comercial');
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível excluir.');
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Bloco titulo="Identificação" desabilitado={somenteLeitura}>
        <Linha>
          <div className="form-group" style={{ flex: '1 1 160px', marginBottom: 16 }}>
            <label className="form-label" htmlFor="tipo">Tipo</label>
            <select
              id="tipo"
              name="tipo"
              className="form-select"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as 'PJ' | 'PF')}
            >
              <option value="PJ">Empresa (CNPJ)</option>
              <option value="PF">Pessoa física (CPF)</option>
            </select>
          </div>

          <Campo
            label={pessoaJuridica ? 'Razão social' : 'Nome completo'}
            name="nome"
            defaultValue={cliente?.nome}
            placeholder={pessoaJuridica ? 'Ex: Pizzaria Bella Massa Ltda' : 'Ex: Maria Aparecida Souza'}
            largura={3}
            obrigatorio
          />
        </Linha>

        <Linha>
          {pessoaJuridica && (
            <Campo
              label="Nome fantasia"
              name="nomeFantasia"
              defaultValue={cliente?.nomeFantasia}
              placeholder="Ex: Bella Massa"
              largura={2}
            />
          )}
          <Campo
            label={pessoaJuridica ? 'CNPJ' : 'CPF'}
            name="documento"
            defaultValue={cliente?.documento}
            placeholder={pessoaJuridica ? '00.000.000/0000-00' : '000.000.000-00'}
            largura={2}
          />
          {pessoaJuridica && (
            <Campo
              label="Inscrição estadual"
              name="inscricaoEstadual"
              defaultValue={cliente?.inscricaoEstadual}
              placeholder="ou ISENTO"
            />
          )}
        </Linha>

        <Linha>
          <Campo
            label="Código interno"
            name="codigo"
            defaultValue={cliente?.codigo}
            placeholder="Ex: 1215"
            hint="O número que aparece na folha dos coletores."
          />
        </Linha>
      </Bloco>

      {/* Este bloco não usa <Bloco> porque o "Mostrar as senhas" precisa
          continuar clicável para quem só consulta: dentro de um fieldset
          desabilitado ele morreria junto com os campos. Só as linhas dos IDs
          vão para o fieldset. */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">IDs Correios</div>
        <p className="form-hint" style={{ marginTop: -8, marginBottom: 10 }}>
          O mesmo cliente costuma ter mais de um — um por contrato ou cartão de
          postagem. O apelido é só para o balcão saber qual é qual.
        </p>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, cursor: 'pointer', fontSize: '0.875rem' }}>
          <input
            type="checkbox"
            checked={mostrarSenhas}
            onChange={(e) => setMostrarSenhas(e.target.checked)}
          />
          Mostrar as senhas
        </label>

        <fieldset disabled={somenteLeitura} style={{ border: 0, padding: 0, margin: 0 }}>
        {/* Marca que esta tela mexe nos IDs. A tela de Cadastros das Coletas
            não manda isso, então salvar por lá não apaga a lista. */}
        <input type="hidden" name="idsCorreiosEnviados" value="1" />

        {ids.map((linha, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 10 }}>
            <div style={{ flex: '2 1 150px' }}>
              {i === 0 && <label className="form-label" htmlFor={`idNumero-${i}`}>Número</label>}
              <input
                id={`idNumero-${i}`}
                name="idNumero"
                className="form-input"
                value={linha.numero}
                onChange={(e) => trocarId(i, 'numero', e.target.value)}
                placeholder="Ex: 9912345678"
                autoComplete="off"
              />
            </div>
            <div style={{ flex: '3 1 170px' }}>
              {i === 0 && <label className="form-label" htmlFor={`idApelido-${i}`}>Para quê</label>}
              <input
                id={`idApelido-${i}`}
                name="idApelido"
                className="form-input"
                value={linha.apelido}
                onChange={(e) => trocarId(i, 'apelido', e.target.value)}
                placeholder="Ex: Sedex, Contrato da matriz"
                autoComplete="off"
              />
            </div>
            <div style={{ flex: '2 1 130px' }}>
              {i === 0 && <label className="form-label" htmlFor={`idSenha-${i}`}>Senha</label>}
              <input
                id={`idSenha-${i}`}
                name="idSenha"
                type={mostrarSenhas ? 'text' : 'password'}
                className="form-input"
                value={linha.senha}
                onChange={(e) => trocarId(i, 'senha', e.target.value)}
                placeholder="Senha deste ID"
                /* new-password para o navegador não oferecer salvar nem
                   preencher com a senha de quem está usando o sistema. */
                autoComplete="new-password"
              />
            </div>
            {!somenteLeitura && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => removerId(i)}
                title="Remover este ID"
                style={{ marginBottom: 2 }}
              >
                Remover
              </button>
            )}
          </div>
        ))}

        {!somenteLeitura && (
          <button type="button" className="btn btn-outline btn-sm" onClick={adicionarId}>
            + Adicionar ID
          </button>
        )}
        </fieldset>
      </div>

      {/* Quem assina e quem atende quase nunca são a mesma pessoa: o contrato
          sai no nome do dono, e quem recebe o coletor é outra. Por isso são
          dois blocos, e não um "responsável" que serve para as duas coisas. */}
      {pessoaJuridica && (
        <Bloco titulo="Quem assina o contrato" desabilitado={somenteLeitura}>
          <p className="form-hint" style={{ marginTop: -8, marginBottom: 14 }}>
            A pessoa física por trás do CNPJ — é dela que os Correios pedem o CPF.
          </p>
          <Linha>
            <Campo
              label="Nome"
              name="responsavel"
              defaultValue={cliente?.responsavel}
              placeholder="Quem responde pela empresa"
              largura={2}
            />
            <Campo
              label="CPF"
              name="cpfResponsavel"
              defaultValue={cliente?.cpfResponsavel}
              placeholder="000.000.000-00"
            />
            <Campo
              label="RG"
              name="rgResponsavel"
              defaultValue={cliente?.rgResponsavel}
              placeholder="MG-00.000.000"
            />
          </Linha>
          <Linha>
            <Campo
              label="Data de nascimento"
              name="nascimentoResponsavel"
              tipo="date"
              defaultValue={cliente?.nascimentoResponsavel}
            />
            <Campo
              label="Nome da mãe"
              name="nomeMaeResponsavel"
              defaultValue={cliente?.nomeMaeResponsavel}
              placeholder="Como está no documento"
              largura={2}
            />
          </Linha>
        </Bloco>
      )}

      <Bloco
        titulo={pessoaJuridica ? 'Quem atende no dia a dia' : 'Contato'}
        desabilitado={somenteLeitura}
      >
        <Linha>
          <Campo
            label="Falar com"
            name="contatoNome"
            defaultValue={cliente?.contatoNome}
            placeholder="Quem o coletor e o balcão procuram"
            largura={2}
          />
          <Campo
            label="Telefone / WhatsApp"
            name="telefone"
            defaultValue={cliente?.telefone}
            placeholder="(31) 90000-0000"
          />
          <Campo
            label="E-mail"
            name="email"
            tipo="email"
            defaultValue={cliente?.email}
            placeholder="contato@empresa.com.br"
            largura={2}
          />
        </Linha>
      </Bloco>

      <Bloco titulo="Endereço da coleta" desabilitado={somenteLeitura}>
        <Linha>
          <Campo label="CEP" name="cep" defaultValue={cliente?.cep} placeholder="00000-000" />
          <Campo label="Rua" name="rua" defaultValue={cliente?.rua} placeholder="Ex: Rua Sete de Setembro" largura={3} />
          <Campo label="Número" name="numero" defaultValue={cliente?.numero} placeholder="Ex: 120" />
        </Linha>
        <Linha>
          <Campo label="Complemento" name="complemento" defaultValue={cliente?.complemento} placeholder="Sala, loja, galpão" largura={2} />
          <Campo label="Bairro" name="bairro" defaultValue={cliente?.bairro} placeholder="Ex: Centro" largura={2} />
          <Campo label="Cidade" name="cidade" defaultValue={cliente?.cidade} placeholder="Ex: Itabira" largura={2} />
          <Campo label="UF" name="uf" defaultValue={cliente?.uf} placeholder="MG" />
        </Linha>
      </Bloco>

      <Bloco titulo="Observação" desabilitado={somenteLeitura}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <textarea
            id="observacao"
            name="observacao"
            className="form-textarea"
            defaultValue={cliente?.observacao ?? ''}
            placeholder="Horário que preferem, onde deixar a encomenda, combinado de contrato…"
            rows={3}
          />
        </div>
      </Bloco>

      {erro && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{erro}</div>}

      {somenteLeitura ? (
        <Link href="/comercial" className="btn btn-outline">← Voltar para a lista</Link>
      ) : (
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="submit" className="btn btn-primary" disabled={salvando}>
          {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Cadastrar cliente'}
        </button>
        <Link href="/comercial" className="btn btn-outline">Cancelar</Link>

        {cliente && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleAtivo}>
              {cliente.ativo ? 'Desativar' : 'Reativar'}
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={handleExcluir}>
              Excluir
            </button>
          </div>
        )}
      </div>
      )}
    </form>
  );
}
