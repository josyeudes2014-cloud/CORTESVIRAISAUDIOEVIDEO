import {
  ArrowLeft,
  Captions,
  Check,
  Clock3,
  Download,
  FileAudio2,
  Info,
  Layers3,
  Pause,
  Play,
  RotateCcw,
  Scissors,
  Search,
  Sparkles,
  Volume2,
  WandSparkles,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  clamp,
  downloadBlob,
  exportMediaRange,
  formatBytes,
  formatTime,
} from '../lib/media';
import type { ClipRange, LocalProject, WorkspaceTab } from '../types';

interface StudioProps {
  project: LocalProject;
  onClose: () => void;
}

interface SavedClip extends ClipRange {
  id: string;
  createdAt: number;
}

function fileSafeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export function Studio({ project, onClose }: StudioProps) {
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const [range, setRange] = useState<ClipRange>({
    start: 0,
    end: Math.min(project.duration, 60),
  });
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('moments');
  const [query, setQuery] = useState('');
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const [savedClips, setSavedClips] = useState<SavedClip[]>([]);

  const clipDuration = Math.max(0, range.end - range.start);
  const selectionStart = (range.start / project.duration) * 100;
  const selectionWidth = (clipDuration / project.duration) * 100;

  const projectMeta = useMemo(
    () => `${formatTime(project.duration)} • ${formatBytes(project.size)} • ${project.kind === 'video' ? 'vídeo' : 'áudio'}`,
    [project],
  );

  useEffect(() => {
    setRange({ start: 0, end: Math.min(project.duration, 60) });
    setCurrentTime(0);
    setSavedClips([]);
    setExportError(null);
    setSearchNotice(null);
  }, [project]);

  const seek = (seconds: number) => {
    const media = mediaRef.current;
    if (!media) return;
    const next = clamp(seconds, 0, project.duration);
    media.currentTime = next;
    setCurrentTime(next);
  };

  const togglePlayback = async () => {
    const media = mediaRef.current;
    if (!media) return;
    if (media.paused) {
      try {
        await media.play();
      } catch {
        setExportError('O navegador bloqueou a reprodução automática. Use os controles do player para iniciar.');
      }
    } else {
      media.pause();
    }
  };

  const updateStart = (value: number) => {
    const next = clamp(value, 0, Math.max(0, range.end - 0.25));
    setRange((previous) => ({ ...previous, start: next }));
  };

  const updateEnd = (value: number) => {
    const next = clamp(value, Math.min(project.duration, range.start + 0.25), project.duration);
    setRange((previous) => ({ ...previous, end: next }));
  };

  const resetRange = () => {
    const next = { start: 0, end: Math.min(project.duration, 60) };
    setRange(next);
    seek(next.start);
  };

  const exportClip = async () => {
    const media = mediaRef.current;
    if (!media || exporting) return;

    setExporting(true);
    setExportProgress(0);
    setExportError(null);

    const onProgress = () => {
      const progress = clamp((media.currentTime - range.start) / clipDuration, 0, 1);
      setExportProgress(progress);
    };
    media.addEventListener('timeupdate', onProgress);

    try {
      const result = await exportMediaRange(media, project.kind, range.start, range.end);
      const suffix = `${Math.floor(range.start)}-${Math.floor(range.end)}`;
      const filename = `${fileSafeName(project.name) || 'corte'}-${suffix}.${result.extension}`;
      downloadBlob(result.blob, filename);
      setSavedClips((items) => [
        { id: crypto.randomUUID(), start: range.start, end: range.end, createdAt: Date.now() },
        ...items,
      ]);
      setExportProgress(1);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Não foi possível exportar este corte.');
    } finally {
      media.removeEventListener('timeupdate', onProgress);
      setExporting(false);
    }
  };

  const runSearch = () => {
    if (!query.trim()) return;
    setSearchNotice(
      'A busca por fala depende de um provedor de transcrição ainda não conectado. O corte manual e a exportação local já estão funcionando.',
    );
  };

  return (
    <main className="studio-shell">
      <header className="studio-topbar">
        <div className="studio-title-group">
          <button className="icon-button" type="button" onClick={onClose} aria-label="Voltar para o início">
            <ArrowLeft size={20} />
          </button>
          <div className="project-thumb" aria-hidden="true">
            {project.kind === 'video' ? <Scissors size={20} /> : <FileAudio2 size={20} />}
          </div>
          <div className="project-title-copy">
            <span className="section-kicker">Projeto local</span>
            <h1 title={project.name}>{project.name}</h1>
            <p>{projectMeta}</p>
          </div>
        </div>

        <div className="studio-actions">
          <span className="local-pill">
            <Check size={14} aria-hidden="true" />
            arquivo local
          </span>
          <button className="button button-primary" type="button" onClick={exportClip} disabled={exporting}>
            <Download size={17} aria-hidden="true" />
            {exporting ? `Exportando ${Math.round(exportProgress * 100)}%` : 'Exportar corte'}
          </button>
        </div>
      </header>

      <section className="ai-search-bar" aria-label="Busca inteligente no conteúdo">
        <Search size={18} aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSearchNotice(null);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') runSearch();
          }}
          placeholder="Encontre qualquer momento: “quando ele fala sobre família...”"
        />
        <button className="search-action" type="button" onClick={runSearch} disabled={!query.trim()}>
          <Sparkles size={16} aria-hidden="true" />
          Encontrar
        </button>
      </section>

      {searchNotice ? (
        <div className="studio-notice" role="status">
          <Info size={17} aria-hidden="true" />
          <span>{searchNotice}</span>
        </div>
      ) : null}

      <div className="studio-grid">
        <section className="preview-column" aria-label="Preview e timeline">
          <div className={`media-stage ${project.kind === 'audio' ? 'audio-stage' : ''}`}>
            {project.kind === 'video' ? (
              <video
                ref={(node) => {
                  mediaRef.current = node;
                }}
                src={project.url}
                controls
                playsInline
                preload="metadata"
                onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            ) : (
              <div className="audio-player-shell">
                <div className="audio-art" aria-hidden="true">
                  <Volume2 size={42} />
                </div>
                <div>
                  <span className="section-kicker">Áudio carregado</span>
                  <h2>{project.name}</h2>
                  <p>Use os controles abaixo para definir o trecho.</p>
                </div>
                <audio
                  ref={(node) => {
                    mediaRef.current = node;
                  }}
                  src={project.url}
                  controls
                  preload="metadata"
                  onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              </div>
            )}
          </div>

          <div className="transport-row">
            <button className="transport-button" type="button" onClick={() => seek(range.start)}>
              <Clock3 size={16} aria-hidden="true" />
              Ir para início
            </button>
            <button className="play-button" type="button" onClick={togglePlayback} aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}>
              {isPlaying ? <Pause size={19} /> : <Play size={19} fill="currentColor" />}
            </button>
            <button className="transport-button" type="button" onClick={() => seek(range.end)}>
              Ir para fim
              <Clock3 size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="timeline-card">
            <div className="timeline-header">
              <div>
                <span className="section-kicker">Timeline</span>
                <strong>{formatTime(currentTime)}</strong>
                <span className="timeline-total">/ {formatTime(project.duration)}</span>
              </div>
              <button className="text-button" type="button" onClick={resetRange}>
                <RotateCcw size={15} aria-hidden="true" />
                redefinir
              </button>
            </div>

            <div className="timeline-visual" aria-hidden="true">
              <div className="timeline-wave">
                {Array.from({ length: 52 }, (_, index) => (
                  <span key={index} style={{ height: `${24 + ((index * 17) % 54)}%` }} />
                ))}
              </div>
              <div
                className="timeline-selection"
                style={{ left: `${selectionStart}%`, width: `${selectionWidth}%` }}
              />
              <div className="timeline-playhead" style={{ left: `${(currentTime / project.duration) * 100}%` }} />
            </div>

            <div className="range-control-grid">
              <label>
                <span>Início</span>
                <strong>{formatTime(range.start)}</strong>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0.25, range.end - 0.25)}
                  step={0.05}
                  value={range.start}
                  onChange={(event) => updateStart(Number(event.target.value))}
                />
              </label>
              <label>
                <span>Fim</span>
                <strong>{formatTime(range.end)}</strong>
                <input
                  type="range"
                  min={Math.min(project.duration, range.start + 0.25)}
                  max={project.duration}
                  step={0.05}
                  value={range.end}
                  onChange={(event) => updateEnd(Number(event.target.value))}
                />
              </label>
            </div>
          </div>
        </section>

        <aside className="inspector-column" aria-label="Configurações do corte">
          <div className="inspector-card clip-card">
            <div className="inspector-heading">
              <div>
                <span className="section-kicker">Corte atual</span>
                <h2>{formatTime(clipDuration)}</h2>
              </div>
              <span className="live-dot">pronto</span>
            </div>

            <div className="time-input-grid">
              <label>
                Início (s)
                <input
                  type="number"
                  min={0}
                  max={Math.max(0, range.end - 0.25)}
                  step={0.05}
                  value={Number(range.start.toFixed(2))}
                  onChange={(event) => updateStart(Number(event.target.value))}
                />
              </label>
              <label>
                Fim (s)
                <input
                  type="number"
                  min={Math.min(project.duration, range.start + 0.25)}
                  max={project.duration}
                  step={0.05}
                  value={Number(range.end.toFixed(2))}
                  onChange={(event) => updateEnd(Number(event.target.value))}
                />
              </label>
            </div>

            <button className="button button-secondary full-width" type="button" onClick={() => seek(range.start)}>
              <Play size={16} fill="currentColor" aria-hidden="true" />
              Pré-visualizar início
            </button>
            <button className="button button-primary full-width" type="button" onClick={exportClip} disabled={exporting}>
              <Download size={17} aria-hidden="true" />
              {exporting ? 'Gravando corte em tempo real...' : 'Exportar este trecho'}
            </button>

            {exporting ? (
              <div className="progress-block" aria-live="polite">
                <div className="progress-meta">
                  <span>Exportação local</span>
                  <strong>{Math.round(exportProgress * 100)}%</strong>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${exportProgress * 100}%` }} />
                </div>
                <small>Mantenha esta aba aberta até concluir.</small>
              </div>
            ) : null}

            {exportError ? (
              <div className="inline-alert" role="alert">
                {exportError}
              </div>
            ) : null}
          </div>

          <div className="inspector-card">
            <div className="tab-row" role="tablist" aria-label="Informações do projeto">
              <button
                role="tab"
                aria-selected={activeTab === 'moments'}
                className={activeTab === 'moments' ? 'is-active' : ''}
                onClick={() => setActiveTab('moments')}
                type="button"
              >
                Momentos
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'transcript'}
                className={activeTab === 'transcript' ? 'is-active' : ''}
                onClick={() => setActiveTab('transcript')}
                type="button"
              >
                Transcrição
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'clips'}
                className={activeTab === 'clips' ? 'is-active' : ''}
                onClick={() => setActiveTab('clips')}
                type="button"
              >
                Cortes
              </button>
            </div>

            {activeTab === 'moments' ? (
              <div className="feature-state">
                <span className="feature-state-icon">
                  <WandSparkles size={21} aria-hidden="true" />
                </span>
                <h3>Busca inteligente preparada</h3>
                <p>
                  A interface de “Encontrar momentos” está pronta para receber transcrição e embeddings. Nenhum
                  resultado é inventado enquanto o provedor não estiver configurado.
                </p>
              </div>
            ) : null}

            {activeTab === 'transcript' ? (
              <div className="feature-state">
                <span className="feature-state-icon">
                  <Captions size={21} aria-hidden="true" />
                </span>
                <h3>Transcrição ainda não conectada</h3>
                <p>
                  Este projeto não expõe chaves de IA no navegador. Conecte um serviço de transcrição no backend
                  para liberar texto sincronizado e pesquisa por fala.
                </p>
              </div>
            ) : null}

            {activeTab === 'clips' ? (
              <div className="saved-clips">
                {savedClips.length === 0 ? (
                  <div className="feature-state compact">
                    <span className="feature-state-icon">
                      <Layers3 size={21} aria-hidden="true" />
                    </span>
                    <h3>Nenhum corte exportado</h3>
                    <p>Escolha início e fim e use “Exportar este trecho”.</p>
                  </div>
                ) : (
                  savedClips.map((clip, index) => (
                    <button
                      type="button"
                      className="saved-clip-row"
                      key={clip.id}
                      onClick={() => {
                        setRange({ start: clip.start, end: clip.end });
                        seek(clip.start);
                      }}
                    >
                      <span className="clip-number">{String(savedClips.length - index).padStart(2, '0')}</span>
                      <span>
                        <strong>{formatTime(clip.start)} → {formatTime(clip.end)}</strong>
                        <small>{formatTime(clip.end - clip.start)} exportado</small>
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </main>
  );
}
