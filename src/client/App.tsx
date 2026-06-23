import { useEffect, useRef, useState } from 'react';
import { Fault, SimParams } from './types';
import { useSimulation } from './hooks/useSimulation';
import { useTheme } from './contexts/ThemeContext';
import { Theme } from './contexts/ThemeContext';
import { useLanguage } from './contexts/LanguageContext';
import { useT } from './i18n';
import { ParametersPanel } from './components/ParametersPanel';
import { LogPanel } from './components/LogPanel';
import { GanttPanel } from './components/GanttPanel';
import { MapPanel } from './components/MapPanel';
import { StatsPanel } from './components/StatsPanel';
import { LandingPage } from './components/LandingPage';
import { ResultsOverlay } from './components/ResultsOverlay';

const DEFAULT_PARAMS: SimParams = {
  minuteSLA: 60,
  switchableFaults: 22,
  limitedParts: 0,
  storm2Window: 'T+6h',
  availableCrews: 22,
};

export default function App() {
  const [params, setParams] = useState<SimParams>(DEFAULT_PARAMS);
  const [initialFaults, setInitialFaults] = useState<Fault[]>([]);
  const [showLanding, setShowLanding] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const themePickerRef = useRef<HTMLDivElement>(null);
  const langPickerRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const { lang, setLang, cycleLang } = useLanguage();
  const t = useT();

  const { state, startSimulation, tickAgentProgress } = useSimulation(initialFaults);

  useEffect(() => {
    if (!showThemePicker) return;
    function handleClick(e: MouseEvent) {
      if (themePickerRef.current && !themePickerRef.current.contains(e.target as Node)) {
        setShowThemePicker(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showThemePicker]);

  useEffect(() => {
    if (!showLangPicker) return;
    function handleClick(e: MouseEvent) {
      if (langPickerRef.current && !langPickerRef.current.contains(e.target as Node)) {
        setShowLangPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showLangPicker]);

  useEffect(() => {
    fetch('/api/scenario').then(r => r.json()).then(d => setInitialFaults(d.faults ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (state.running) { tickRef.current = setInterval(tickAgentProgress, 400); }
    else if (tickRef.current) clearInterval(tickRef.current);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [state.running, tickAgentProgress]);

  useEffect(() => {
    if (state.done) {
      const t = setTimeout(() => setShowResults(true), 800);
      return () => clearTimeout(t);
    }
  }, [state.done]);

  const safetyPct = state.safetyLimit > 0 ? Math.min(100, (state.safetyElapsed / state.safetyLimit) * 100) : 0;

  if (showLanding) {
    return <LandingPage onEnter={() => setShowLanding(false)} />;
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg-base)' }}>

      {/* Header */}
      <header className="flex items-center gap-3 px-4 h-11 flex-shrink-0 border-b"
        style={{ background: 'var(--bg-header)', borderColor: 'var(--border)' }}>
        <span className="font-bold text-sm tracking-wide flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/SAP_2011_logo.svg/1280px-SAP_2011_logo.svg.png" alt="SAP" style={{ height: 18, width: 'auto' }} />
          {t.app.title}
        </span>

        {/* Status chip */}
        <div className="ml-2">
          {state.running ? (
            <span className="sap-tag" style={{ background: 'var(--status-running-bg)', color: 'var(--status-running-color)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" /> {t.app.running}
            </span>
          ) : state.done ? (
            <span className="sap-tag" style={{ background: 'var(--status-done-bg)', color: 'var(--status-done-color)' }}>{t.app.done}</span>
          ) : (
            <span className="sap-tag" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>{t.app.standby}</span>
          )}
        </div>

        {/* View report button */}
        {state.done && !state.running && (
          <button
            onClick={() => setShowResults(v => !v)}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-lg"
            style={{
              background: showResults ? 'rgba(124,58,237,0.15)' : 'var(--accent-subtle)',
              color: 'var(--accent)',
              border: `1px solid color-mix(in srgb, var(--accent) 40%, transparent)`,
              cursor: 'pointer',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {t.app.report}
          </button>
        )}

        {/* Safety window bar */}
        <div className="ml-auto flex items-center gap-2" style={{ minWidth: 240 }}>
          <span className="text-xs font-mono whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{t.app.window} {params.storm2Window}</span>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${safetyPct}%`,
                background: safetyPct > 80 ? '#ef4444' : safetyPct > 60 ? '#f97316' : '#3b82f6',
              }} />
          </div>
          <span className="text-xs font-mono whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{state.elapsedLabel}</span>
        </div>

        {/* Language picker dropdown */}
        <div className="relative flex-shrink-0" ref={langPickerRef}>
          <button
            onClick={() => setShowLangPicker(v => !v)}
            className="flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-xs font-medium"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <span>{lang === 'es' ? '🇪🇸' : lang === 'en' ? '🇬🇧' : '🇵🇹'}</span>
            <span>{lang === 'es' ? 'ES' : lang === 'en' ? 'EN' : 'PT'}</span>
            <svg width="8" height="5" viewBox="0 0 8 5" fill="currentColor"><path d="M0 0l4 5 4-5z"/></svg>
          </button>
          {showLangPicker && (
            <div
              className="absolute right-0 top-full mt-1 rounded-lg overflow-hidden z-[9000]"
              style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-accent)', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', minWidth: 120 }}
            >
              {([
                { value: 'es', icon: '🇪🇸', label: 'ES' },
                { value: 'en', icon: '🇬🇧', label: 'EN' },
                { value: 'pt', icon: '🇵🇹', label: 'PT' },
              ] as { value: 'es' | 'en' | 'pt'; icon: string; label: string }[]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setLang(opt.value); setShowLangPicker(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors"
                  style={{
                    background: lang === opt.value ? 'var(--accent-subtle)' : 'transparent',
                    color: lang === opt.value ? 'var(--accent)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  <span>{opt.icon}</span>
                  <span className="font-medium">{opt.label}</span>
                  {lang === opt.value && <span className="ml-auto opacity-70">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme picker dropdown */}
        <div className="relative flex-shrink-0" ref={themePickerRef}>
          <button
            onClick={() => setShowThemePicker(v => !v)}
            className="flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-xs font-medium"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <span>{theme === 'dark' ? '🌙' : theme === 'joule' ? '☀' : '⚡'}</span>
            <span>{theme === 'dark' ? t.themes.dark : theme === 'joule' ? t.themes.joule : t.themes.iberdrola}</span>
            <svg width="8" height="5" viewBox="0 0 8 5" fill="currentColor"><path d="M0 0l4 5 4-5z"/></svg>
          </button>
          {showThemePicker && (
            <div
              className="absolute right-0 top-full mt-1 rounded-lg overflow-hidden z-[9000]"
              style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-accent)', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', minWidth: 140 }}
            >
              {([
                { value: 'dark', icon: '🌙', label: t.themes.dark },
                { value: 'joule', icon: '☀', label: t.themes.joule },
                { value: 'iberdrola', icon: '⚡', label: t.themes.iberdrola },
              ] as { value: Theme; icon: string; label: string }[]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setTheme(opt.value); setShowThemePicker(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors"
                  style={{
                    background: theme === opt.value ? 'var(--accent-subtle)' : 'transparent',
                    color: theme === opt.value ? 'var(--accent)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  <span>{opt.icon}</span>
                  <span className="font-medium">{opt.label}</span>
                  {theme === opt.value && <span className="ml-auto opacity-70">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Back to landing */}
        <button
          onClick={() => setShowLanding(true)}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-lg"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-dim)', border: '1px solid var(--border)', cursor: 'pointer' }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          {t.nav.back}
        </button>
      </header>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside
          className="flex-shrink-0 border-r overflow-y-auto transition-all duration-300"
          style={{
            width: sidebarOpen ? '13rem' : '2rem',
            background: 'var(--bg-card)',
            borderColor: 'var(--border)',
            overflow: sidebarOpen ? 'auto' : 'hidden',
          }}
        >
          {/* Collapse toggle in the PARÁMETROS header */}
          <div
            className="flex items-center justify-between px-3 py-2 border-b sticky top-0 z-10"
            style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}
          >
            {sidebarOpen && (
              <span className="text-[13px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                {t.params.header}
              </span>
            )}
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className="flex items-center justify-center w-5 h-5 rounded transition-colors flex-shrink-0"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: sidebarOpen ? 'auto' : '0' }}
              title={sidebarOpen ? 'Hide parameters' : 'Show parameters'}
            >
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                {sidebarOpen
                  ? <path d="M6 1L2 4.5L6 8" />
                  : <path d="M3 1L7 4.5L3 8" />}
              </svg>
            </button>
          </div>
          {sidebarOpen && (
            <ParametersPanel
              params={params}
              onChange={p => setParams(prev => ({ ...prev, ...p }))}
              onSimulate={() => { setShowResults(false); startSimulation(params, lang); }}
              running={state.running}
              kpi={state.kpi}
              drolius={state.drolius}
            />
          )}
        </aside>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-base)' }}>

          {/* TOP: Map + Flow */}
          <div className="flex overflow-hidden gap-2 p-2" style={{ flex: '0 0 42%' }}>
            <div className="overflow-hidden rounded border flex-1" style={{ borderColor: 'var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
              <MapPanel faults={state.faults.length > 0 ? state.faults : initialFaults} drolius={state.drolius} />
            </div>
            <div className="overflow-hidden flex-shrink-0" style={{ flex: '0 0 36%' }}>
              <GanttPanel agents={state.agents} conflicts={state.conflicts} orchestratorStatus={state.orchestratorStatus} />
            </div>
          </div>

          {/* BOTTOM: Log + Comms */}
          <div className="flex overflow-hidden gap-2 px-2 pb-2" style={{ flex: '0 0 58%' }}>
            <div className="overflow-hidden flex-1">
              <LogPanel logs={state.agentLogs} running={state.running} />
            </div>
            <div className="overflow-hidden flex-shrink-0" style={{ flex: '0 0 36%' }}>
              <StatsPanel messages={state.commsMessages} actionMessages={state.actionMessages} />
            </div>
          </div>

        </div>
      </div>

      {showResults && (
        <ResultsOverlay
          faults={state.faults}
          kpi={state.kpi}
          agentLogs={state.agentLogs}
          commsMessages={state.commsMessages}
          actionMessages={state.actionMessages}
          conflicts={state.conflicts}
          elapsedLabel={state.elapsedLabel}
          onClose={() => setShowResults(false)}
        />
      )}
    </div>
  );
}
