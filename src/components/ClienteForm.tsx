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
  idCorreios: string | null;
  responsavel: string | null;
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
}

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

export default function ClienteForm({ cliente }: Props) {
  const router = useRouter();
  const editando = !!cliente;

  const [tipo, setTipo] = useState<'PJ' | 'PF'>(cliente?.tipo ?? 'PJ');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const pessoaJuridica = tipo === 'PJ';

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
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Identificação</div>

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
          <Campo
            label="ID Correios"
            name="idCorreios"
            defaultValue={cliente?.idCorreios}
            placeholder="Ex: 9912345678"
          />
        </Linha>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Contato</div>
        <Linha>
          <Campo
            label="Responsável"
            name="responsavel"
            defaultValue={cliente?.responsavel}
            placeholder="Quem atende a gente"
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
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Endereço da coleta</div>
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
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Observação</div>
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
      </div>

      {erro && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{erro}</div>}

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
    </form>
  );
}
