import {
  ArrowRight,
  Captions,
  FileAudio,
  FileVideo2,
  Frame,
  Mic2,
  Scissors,
  Search,
  Sparkles,
  UploadCloud,
  WandSparkles,
} from 'lucide-react';
import { useRef, useState } from 'react';

interface StartPanelProps {
  busy: boolean;
  error: string | null;
  onFileSelected: (file: File) => void;
  onUrlSubmit: (url: string) => void;
}

const quickActions = [
  { label: 'Cortar vídeo', helper: 'Defina início e fim com precisão', icon: Scissors },
  { label: 'Cortes com IA', helper: 'Prepare o conteúdo para análise', icon: Sparkles },
  { label: 'Encontrar momentos', helper: 'Busque falas e assuntos no conteúdo', icon: Search },
  { label: 'Legendar', helper: 'Abra o fluxo de legendas', icon: Captions },
  { label: 'Transcrever', helper: 'Transforme fala em texto pesquisável', icon: Mic2 },
  { label: 'Auto reframe', helper: 'Prepare para 9:16, 4:5 ou 1:1', icon: Frame },
];

export function StartPanel({ busy, error, onFileSelected, onUrlSubmit }: StartPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const openFilePicker = () => inputRef.current?.click();

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFileSelected(file);
  };

  return (
    <main className="home-shell">
      <section className="hero-section" aria-labelledby="hero-title">
        <div className="eyebrow">
          <span className="eyebrow-dot" aria-hidden="true" />
          edição local • sem créditos • sem paywall
        </div>
        <h1 id="hero-title">
          Encontre o momento.
          <span>Corte o que importa.</span>
        </h1>
        <p className="hero-copy">
          Envie um vídeo ou áudio, escolha o trecho certo e exporte direto no navegador. A base já está
          preparada para receber transcrição e busca inteligente sem complicar o fluxo principal.
        </p>

        <div className="start-card">
          <div className="start-card-header">
            <div>
              <span className="section-kicker">Comece agora</span>
              <h2>Abra seu conteúdo</h2>
            </div>
            <div className="format-chips" aria-label="Formatos principais suportados">
              <span>MP4</span>
              <span>MOV</span>
              <span>WEBM</span>
              <span>MP3</span>
              <span>WAV</span>
            </div>
          </div>

          <form
            className="url-row"
            onSubmit={(event) => {
              event.preventDefault();
              if (url.trim()) onUrlSubmit(url.trim());
            }}
          >
            <label className="sr-only" htmlFor="media-url">
              Link do vídeo
            </label>
            <div className="url-input-wrap">
              <FileVideo2 size={18} aria-hidden="true" />
              <input
                id="media-url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="Cole um link de mídia autorizado..."
                disabled={busy}
                inputMode="url"
                autoComplete="off"
              />
            </div>
            <button className="button button-primary button-url" type="submit" disabled={busy || !url.trim()}>
              Analisar
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </form>

          <div className="or-divider" role="separator">
            <span>ou</span>
          </div>

          <button
            type="button"
            className={`dropzone ${dragActive ? 'is-dragging' : ''}`}
            onClick={openFilePicker}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              event.preventDefault();
              if (event.currentTarget === event.target) setDragActive(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              handleFiles(event.dataTransfer.files);
            }}
            disabled={busy}
          >
            <span className="dropzone-icon" aria-hidden="true">
              {busy ? <WandSparkles size={25} /> : <UploadCloud size={25} />}
            </span>
            <span className="dropzone-title">{busy ? 'Preparando seu arquivo...' : 'Arraste um arquivo ou clique para enviar'}</span>
            <span className="dropzone-copy">Vídeo ou áudio • processamento inicial acontece no seu navegador</span>
          </button>

          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            accept="video/*,audio/*,.mkv,.avi,.flac"
            onChange={(event) => handleFiles(event.target.files)}
          />

          {error ? (
            <div className="inline-alert" role="alert">
              {error}
            </div>
          ) : null}
        </div>
      </section>

      <section className="quick-section" aria-labelledby="quick-title">
        <div className="section-heading-row">
          <div>
            <span className="section-kicker">Fluxos rápidos</span>
            <h2 id="quick-title">O que você quer fazer?</h2>
          </div>
          <p>Os atalhos abrem o mesmo fluxo de mídia sem criar etapas extras.</p>
        </div>

        <div className="quick-grid">
          {quickActions.map(({ label, helper, icon: Icon }) => (
            <button className="quick-card" type="button" key={label} onClick={openFilePicker} disabled={busy}>
              <span className="quick-icon" aria-hidden="true">
                <Icon size={21} />
              </span>
              <span className="quick-text">
                <strong>{label}</strong>
                <small>{helper}</small>
              </span>
              <ArrowRight className="quick-arrow" size={17} aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>

      <section className="trust-strip" aria-label="Detalhes do fluxo">
        <div>
          <FileVideo2 size={18} aria-hidden="true" />
          <span>Vídeo</span>
          <strong>preview imediato</strong>
        </div>
        <div>
          <FileAudio size={18} aria-hidden="true" />
          <span>Áudio</span>
          <strong>faixa nativa</strong>
        </div>
        <div>
          <Scissors size={18} aria-hidden="true" />
          <span>Corte</span>
          <strong>início e fim precisos</strong>
        </div>
      </section>
    </main>
  );
}
