import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { StoryTab } from './components/StoryTab';
import { Studio3DTab } from './components/Studio3DTab';

type ActiveTab = 'story' | 'demo';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('story');
  const [studioPreset, setStudioPreset] = useState<{
    stage: 1 | 2 | 3 | 4;
    titanium: boolean;
    key: number;
  }>({ stage: 4, titanium: false, key: 0 });
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const notify = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMsg(null), 3600);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const handleOpenStudio = useCallback(
    (opts?: { stage?: 1 | 2 | 3 | 4; titanium?: boolean }) => {
      setStudioPreset((prev) => ({
        stage: opts?.stage ?? 4,
        titanium: opts?.titanium ?? false,
        key: prev.key + 1,
      }));
      setActiveTab('demo');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [],
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-slate-950/92 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400 font-extrabold text-sm">
              3D
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-white text-base sm:text-lg">
                  CranioMold 3D
                </span>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  100% Phantom Sintético · Hack Brasil 2026
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Molde Negativo Bipartido 3D para Prótese Craniana em PMMA no SUS
              </p>
            </div>
          </div>

          <nav
            className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800"
            aria-label="Navegação principal"
          >
            <button
              id="nav-tab-story"
              type="button"
              onClick={() => setActiveTab('story')}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'story'
                  ? 'bg-sky-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              1. A História &amp; Economia SUS
            </button>
            <button
              id="nav-tab-demo"
              type="button"
              onClick={() => setActiveTab('demo')}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'demo'
                  ? 'bg-sky-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              2. Demonstração 3D · Studio CAD
            </button>
          </nav>

          <div className="hidden lg:flex items-center gap-2">
            <a
              href="https://github.com/aramiskamed/projeto-tce"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition"
            >
              <span>GitHub · projeto-tce</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </header>

      {/* ACTIVE VIEW */}
      {activeTab === 'story' ? (
        <StoryTab onOpenStudio={handleOpenStudio} onNotify={notify} />
      ) : (
        <Studio3DTab
          key={studioPreset.key}
          initialStage={studioPreset.stage}
          initialTitaniumMode={studioPreset.titanium}
          onNotify={notify}
        />
      )}

      {/* TOAST NOTIFICATION */}
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl bg-slate-900 border border-sky-500/40 px-4 py-3 shadow-2xl text-sm text-slate-100 flex items-center gap-2.5"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-slate-800/90 bg-slate-950 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            <strong className="text-slate-200">CranioMold 3D · Projeto TCE</strong> — Software
            aberto de pesquisa e planejamento cirúrgico assistido pelo médico (
            <em>physician-in-the-loop</em>). Dados 100% sintéticos (
            <a
              href="https://hackbrasil.com/regulamento"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 underline"
            >
              Hack Brasil 2026, item 6.9
            </a>
            ).
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <a
              href="https://github.com/aramiskamed/projeto-tce"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 hover:underline"
            >
              Repositório GitHub
            </a>
            <a
              href="https://hackbrasil.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-300 hover:underline"
            >
              Hack Brasil 2026
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
