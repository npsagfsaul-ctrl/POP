'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { publicarInformativoSetor } from '@/actions/comunicados';

/**
 * Publicar um informativo no mural em nome do setor.
 *
 * A imagem é reduzida aqui, no navegador, antes de sair do celular: uma foto de
 * 4 MB vira ~150 KB. Isso não é enfeite — não existe disco no Vercel, então a
 * imagem vai para o banco, e sem encolher antes o banco cresceria rápido.
 * Melhor o sistema resolver do que pedir para as pessoas "mandarem leve".
 */

const LARGURA_MAX = 1280;
const LIMITE = 400_000; // mesmo teto do servidor, em caracteres do data URI
const QUALIDADES = [0.7, 0.5, 0.35];

function desenhar(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const escala = Math.min(1, LARGURA_MAX / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Não foi possível processar a imagem.'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler este arquivo como imagem.'));
    };
    img.src = url;
  });
}

async function comprimir(file: File): Promise<string> {
  const canvas = await desenhar(file);
  // Vai baixando a qualidade até caber. Só desiste se nem na pior couber.
  for (const q of QUALIDADES) {
    const dataUri = canvas.toDataURL('image/jpeg', q);
    if (dataUri.length <= LIMITE) return dataUri;
  }
  throw new Error('A imagem é grande demais mesmo depois de comprimida. Tente outra foto.');
}

export default function PublicarInformativo({ setorId, setorNome }: { setorId: string; setorNome: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [validade, setValidade] = useState('');
  const [imagem, setImagem] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [publicado, setPublicado] = useState(false);

  async function escolherImagem(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErro(null);
    setProcessando(true);
    try {
      setImagem(await comprimir(file));
    } catch (err) {
      setImagem(null);
      setErro(err instanceof Error ? err.message : 'Não foi possível usar esta imagem.');
    } finally {
      setProcessando(false);
      e.target.value = ''; // permite escolher o mesmo arquivo de novo
    }
  }

  function limpar() {
    setTitulo('');
    setConteudo('');
    setValidade('');
    setImagem(null);
    setErro(null);
  }

  async function publicar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      await publicarInformativoSetor(setorId, { titulo, conteudo, validade: validade || null, imagem });
      limpar();
      setAberto(false);
      setPublicado(true);
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível publicar.');
    } finally {
      setEnviando(false);
    }
  }

  if (!aberto) {
    return (
      <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => { setPublicado(false); setAberto(true); }}>
          📢 Publicar informativo no mural
        </button>
        {publicado && (
          <span style={{ color: 'var(--success)', fontSize: '0.875rem' }}>
            ✓ Publicado — já está no mural.
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <div className="card-title">Informativo do {setorNome}</div>
      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 16 }}>
        Vai para o mural da agência, assinado como <strong>{setorNome}</strong>, e todo mundo vê.
      </p>

      <form onSubmit={publicar}>
        <div className="form-group">
          <label className="form-label">Título *</label>
          <input
            className="form-input"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: Sistema dos Correios instável"
            maxLength={120}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Texto *</label>
          <textarea
            className="form-input"
            style={{ minHeight: 100 }}
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            placeholder="Escreva o recado para os outros setores."
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Sai do mural em (opcional)</label>
          <input
            type="date"
            className="form-input"
            style={{ maxWidth: 200 }}
            value={validade}
            onChange={(e) => setValidade(e.target.value)}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Deixe em branco para o informativo ficar até alguém apagar.
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">Imagem (opcional)</label>
          {imagem ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagem}
                alt="Prévia da imagem escolhida"
                style={{ maxWidth: 220, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}
              />
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setImagem(null)}>
                Remover
              </button>
            </div>
          ) : (
            <>
              <input type="file" accept="image/*" className="form-input" onChange={escolherImagem} />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Pode mandar a foto direto do celular — o sistema reduz sozinho antes de enviar.
              </p>
            </>
          )}
          {processando && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 6 }}>
              Reduzindo a imagem…
            </p>
          )}
        </div>

        {erro && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{erro}</div>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => { limpar(); setAberto(false); }}
            disabled={enviando}
          >
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={enviando || processando}>
            {enviando ? 'Publicando…' : 'Publicar no mural'}
          </button>
        </div>
      </form>
    </div>
  );
}
