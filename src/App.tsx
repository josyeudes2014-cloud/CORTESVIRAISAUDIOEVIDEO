import { Moon, Scissors, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { StartPanel } from './components/StartPanel';
import { Studio } from './components/Studio';
import { createLocalProject } from './lib/media';
import type { LocalProject } from './types';

function getInitialTheme(): 'dark' | 'light' {
  const stored = window.localStorage.getItem('cortaflow-theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export default function App() {
  const [project, setProject] = useState<LocalProject | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('cortaflow-theme', theme);
  }, [theme]);

  useEffect(
    () => () => {
      if (project?.url.startsWith('blob:')) URL.revokeObjectURL(project.url);
    },
    [project],
  );

  const handleFileSelected = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const nextProject = await createLocalProject(file);
      setProject((current) => {
        if (current?.url.startsWith('blob:')) URL.revokeObjectURL(current.url);
        return nextProject;
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível abrir este arquivo.');
    } finally {
      setBusy(false);
    }
  };

  const handleUrlSubmit = (url: string) => {
    setError(null);
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Use um link HTTP ou HTTPS válido.');
      }
      setError(
        'A importação por link será ativada quando a integração autorizada de mídia estiver configurada no backend. Por enquanto, envie o arquivo para cortar agora.',
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Cole um link válido para continuar.');
    }
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Ir para o conteúdo
      </a>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="CortaFlow, início">
          <span className="brand-mark" aria-hidden="true">
            <Scissors size={19} />
          </span>
          <span>CortaFlow</span>
        </a>

        <div className="header-status">
          <span className="status-dot" aria-hidden="true" />
          Corte local ativo
        </div>

        <button
          className="theme-toggle"
          type="button"
          onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
          aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      <div id="main-content">
        {project ? (
          <Studio
            project={project}
            onClose={() => {
              if (project.url.startsWith('blob:')) URL.revokeObjectURL(project.url);
              setProject(null);
              setError(null);
            }}
          />
        ) : (
          <StartPanel
            busy={busy}
            error={error}
            onFileSelected={handleFileSelected}
            onUrlSubmit={handleUrlSubmit}
          />
        )}
      </div>

      {!project ? (
        <footer className="site-footer">
          <div>
            <strong>CortaFlow</strong>
            <span>Ferramenta de corte direto, sem créditos e sem paywall.</span>
          </div>
          <span>Arquivos locais permanecem no navegador durante esta sessão.</span>
        </footer>
      ) : null}
    </div>
  );
}
