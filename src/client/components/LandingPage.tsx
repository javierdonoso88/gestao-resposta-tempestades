import { useEffect, useRef, useState } from 'react';
import { useTheme, Theme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useT } from '../i18n';

interface Props {
  onEnter: () => void;
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function AgentCard({ label, system, desc, color }: { label: string; system: string; desc: string; color: string }) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3 transition-transform duration-200 hover:scale-[1.02]"
      style={{
        background: `linear-gradient(135deg, rgba(${hexToRgb(color)},0.08), rgba(${hexToRgb(color)},0.02))`,
        border: `1px solid rgba(${hexToRgb(color)},0.25)`,
      }}
    >
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="text-xs font-black tracking-widest" style={{ color }}>{label}</span>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{desc}</p>
      <div
        className="mt-auto text-[10px] font-mono px-2 py-1 rounded self-start"
        style={{ background: `rgba(${hexToRgb(color)},0.08)`, color: 'var(--text-dim)', border: `1px solid rgba(${hexToRgb(color)},0.15)` }}
      >
        {system}
      </div>
    </div>
  );
}

export function LandingPage({ onEnter }: Props) {
  const [vis, setVis] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const themePickerRef = useRef<HTMLDivElement>(null);
  const langPickerRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const { lang, setLang, cycleLang } = useLanguage();
  const t = useT();

  useEffect(() => {
    const t = setTimeout(() => setVis(true), 60);
    return () => clearTimeout(t);
  }, []);

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

  const fade = (delay: number) =>
    `transition-all duration-700 ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}` +
    ` delay-[${delay}ms]`;

  const PHASE1_AGENTS = [
    { label: t.arch.agents.techLabel, system: 'SAP S/4HANA Asset Management + Event Mesh', desc: t.arch.agents.techDesc, color: '#22d3ee' },
    { label: t.arch.agents.scadaLabel, system: 'SAP Asset Intelligence Network', desc: t.arch.agents.scadaDesc, color: '#4ade80' },
  ];

  const PHASE2_AGENTS = [
    { label: t.arch.agents.dispLabel, system: 'SAP Field Service Management', desc: t.arch.agents.dispDesc, color: '#60a5fa' },
    { label: t.arch.agents.resLabel, system: 'SAP Integrated Business Planning', desc: t.arch.agents.resDesc, color: '#c084fc' },
    { label: t.arch.agents.commsLabel, system: 'SAP Customer Experience', desc: t.arch.agents.commsDesc, color: '#f472b6' },
  ];

  return (
    <div className="h-screen overflow-y-auto" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      {/* ── NAV ── */}
      <nav
        className="sticky top-0 z-50 flex items-center gap-3 px-8 h-14"
        style={{ background: 'var(--bg-header)', backdropFilter: 'blur(14px)', borderBottom: '1px solid var(--border)' }}
      >
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/SAP_2011_logo.svg/1280px-SAP_2011_logo.svg.png" alt="SAP" style={{ height: 17 }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--text-ghost)', margin: '0 2px' }}>|</span>
        <span className="text-sm font-semibold tracking-wide" style={{ color: 'var(--text-muted)' }}>{t.app.title}</span>

        {/* Language picker dropdown */}
        <div className="ml-auto relative flex-shrink-0" ref={langPickerRef}>
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

        {/* Theme picker */}
        <div className="relative flex-shrink-0" ref={themePickerRef}>
          <button
            onClick={() => setShowThemePicker(v => !v)}
            className="flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-xs font-medium"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <span>{theme === 'dark' ? '🌙' : theme === 'joule' ? '☀' : '⚡'}</span>
            <span>{theme === 'dark' ? t.themes.dark : theme === 'joule' ? t.themes.joule : t.themes.edp}</span>
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
                { value: 'iberdrola', icon: '⚡', label: t.themes.edp },
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

        <button
          onClick={onEnter}
          className="text-xs font-bold px-4 py-1.5 rounded-lg"
          style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)', cursor: 'pointer' }}
        >
          {t.nav.openSimulator}
        </button>
      </nav>

      {/* ── HERO ── */}
      <section
        className="relative flex flex-col items-center justify-center text-center px-8"
        style={{ minHeight: 'calc(100vh - 56px)', background: 'radial-gradient(ellipse 80% 60% at 50% 40%, color-mix(in srgb, var(--accent) 5%, transparent) 0%, transparent 70%)' }}
      >
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, color-mix(in srgb, var(--accent) 6%, transparent) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className={`mb-7 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest ${fade(0)}`}
          style={{ background: 'var(--accent-subtle)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)', color: 'var(--accent)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          {t.hero.badge}
        </div>

        <h1 className={`font-black leading-none mb-5 ${fade(100)}`}
          style={{ fontSize: 'clamp(2.8rem, 7.5vw, 6rem)', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
          {lang === 'en' ? (
            <>Storm Response<br /><span style={{ color: 'var(--accent)' }}>Management</span></>
          ) : lang === 'es' ? (
            <>Gestión de Respuesta a<br /><span style={{ color: 'var(--accent)' }}>Tempestades</span></>
          ) : (
            <>Gestão de Resposta a<br /><span style={{ color: 'var(--accent)' }}>Tempestades</span></>
          )}
        </h1>

        <p className={`max-w-2xl text-lg leading-relaxed mb-3 ${fade(200)}`} style={{ color: 'var(--text-secondary)' }}>
          {t.hero.subtitle}
        </p>

        <p className={`text-xs font-mono mb-12 tracking-[0.15em] ${fade(300)}`} style={{ color: 'var(--text-ghost)' }}>
          {t.hero.location}
        </p>

        <button
          onClick={onEnter}
          className={`px-10 py-4 rounded-xl font-bold text-base tracking-wide ${fade(400)}`}
          style={{ background: 'linear-gradient(135deg,#0891b2,#0e7490)', color: 'white', boxShadow: '0 0 32px rgba(34,211,238,0.22), 0 4px 20px rgba(0,0,0,0.3)', border: 'none', cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 56px rgba(34,211,238,0.4), 0 4px 20px rgba(0,0,0,0.3)'; e.currentTarget.style.transform = 'scale(1.03)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 32px rgba(34,211,238,0.22), 0 4px 20px rgba(0,0,0,0.3)'; e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {t.hero.cta}
        </button>

        <div className={`mt-20 grid grid-cols-4 gap-10 ${fade(500)}`}>
          {[
            { value: '143K', label: t.stats.clients, sub: t.stats.clientsSub, color: '#ef4444' },
            { value: '47',   label: t.stats.faults,  sub: t.stats.faultsSub,  color: '#f97316' },
            { value: '22',   label: t.stats.crews,   sub: t.stats.crewsSub,   color: '#3b82f6' },
            { value: '7',    label: t.stats.critical, sub: t.stats.criticalSub, color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="font-black mb-1" style={{ fontSize: '2.6rem', color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>{s.label}</div>
              <div className="text-xs" style={{ color: 'var(--text-ghost)' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        <div className="absolute bottom-7 flex flex-col items-center gap-1 animate-bounce" style={{ color: 'var(--text-ghost)' }}>
          <span className="text-[11px] font-mono tracking-widest">{t.hero.scroll}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ── EL RETO ── */}
      <section className="px-8 py-24" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-xs font-bold tracking-widest mb-3" style={{ color: 'var(--accent)' }}>{t.challenge.eyebrow}</div>
          <h2 className="font-black mb-3 leading-tight" style={{ fontSize: 'clamp(2rem,4vw,3rem)', color: 'var(--text-primary)' }}>
            {t.challenge.title}<br />
            <span style={{ color: '#f97316' }}>{t.challenge.titleHighlight}</span>
          </h2>
          <div className="grid grid-cols-2 gap-12 mt-10 items-start">
            <p className="text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {t.challenge.body}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: t.challenge.card1, sub: t.challenge.card1Sub, accent: '#f59e0b' },
                { label: t.challenge.card2, sub: t.challenge.card2Sub, accent: '#ef4444' },
                { label: t.challenge.card3, sub: t.challenge.card3Sub, accent: '#f97316' },
                { label: t.challenge.card4, sub: t.challenge.card4Sub, accent: '#22d3ee' },
              ].map(c => (
                <div key={c.label} className="rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderLeft: `3px solid ${c.accent}` }}>
                  <div className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{c.label}</div>
                  <div className="text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>{c.sub}</div>
                </div>
              ))}
              <div className="col-span-2 rounded-lg p-4 flex items-center gap-4" style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.25)', borderLeft: '3px solid #a78bfa' }}>
                <img src="/anybotics.png" alt="Drolius" className="flex-shrink-0" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                <div>
                  <div className="text-sm font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>{t.challenge.drolius}</div>
                  <div className="text-xs leading-relaxed" style={{ color: '#6d5acd' }}>{t.challenge.droluisSub}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ARQUITECTURA ── */}
      <section className="px-8 py-24" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-base)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-xs font-bold tracking-widest mb-3 text-center" style={{ color: 'var(--accent)' }}>{t.arch.eyebrow}</div>
          <h2 className="font-black mb-2 text-center" style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', color: 'var(--text-primary)' }}>{t.arch.title}</h2>
          <p className="text-center text-sm mb-14" style={{ color: 'var(--text-ghost)' }}>{t.arch.subtitle}</p>

          <div className="flex justify-center mb-5">
            <div className="px-10 py-4 rounded-2xl text-center" style={{ background: 'linear-gradient(135deg,rgba(245,158,11,0.1),rgba(245,158,11,0.04))', border: '1px solid rgba(245,158,11,0.35)', minWidth: 280 }}>
              <div className="text-[10px] font-bold tracking-widest mb-1" style={{ color: '#f59e0b' }}>{t.arch.supervisor}</div>
              <div className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>ASSET AND SERVICES ASSISTANT</div>
              <div className="text-[11px] font-mono mt-1" style={{ color: 'var(--text-dim)' }}>{t.arch.sapSystem}</div>
            </div>
          </div>
          <div className="flex justify-center mb-4">
            <div style={{ width: 1, height: 28, background: 'linear-gradient(rgba(245,158,11,0.3),var(--border))' }} />
          </div>

          <div className="flex items-center gap-4 mb-4 justify-center">
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span className="text-[11px] font-bold tracking-widest px-3 py-1 rounded-full" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)', whiteSpace: 'nowrap' }}>
              {t.arch.phase1}
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {PHASE1_AGENTS.map(a => <AgentCard key={a.label} {...a} />)}
          </div>

          <div className="flex justify-center mb-4">
            <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
          </div>

          <div className="flex items-center gap-4 mb-4 justify-center">
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span className="text-[11px] font-bold tracking-widest px-3 py-1 rounded-full" style={{ background: 'rgba(249,115,22,0.08)', color: '#f97316', border: '1px solid rgba(249,115,22,0.2)', whiteSpace: 'nowrap' }}>
              {t.arch.phase2}
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {PHASE2_AGENTS.map(a => <AgentCard key={a.label} {...a} />)}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section
        className="px-8 py-32 flex flex-col items-center text-center"
        style={{ borderTop: '1px solid var(--border)', background: 'radial-gradient(ellipse 70% 50% at 50% 0%, color-mix(in srgb, var(--accent) 4%, transparent) 0%, transparent 60%)' }}
      >
        <div className="text-xs font-bold tracking-widest mb-5" style={{ color: 'var(--accent)' }}>{t.cta.eyebrow}</div>
        <h2 className="font-black mb-3" style={{ fontSize: 'clamp(2rem,4vw,3.5rem)', color: 'var(--text-primary)' }}>{t.cta.title}</h2>
        <p className="mb-10 text-base max-w-lg" style={{ color: 'var(--text-dim)' }}>{t.cta.body}</p>
        <button
          onClick={onEnter}
          className="px-14 py-5 rounded-2xl font-black text-lg tracking-wide"
          style={{ background: 'linear-gradient(135deg,#0891b2,#0e7490)', color: 'white', boxShadow: '0 0 48px rgba(34,211,238,0.25), 0 8px 32px rgba(0,0,0,0.4)', border: 'none', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = '0 0 72px rgba(34,211,238,0.38), 0 8px 32px rgba(0,0,0,0.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 48px rgba(34,211,238,0.25), 0 8px 32px rgba(0,0,0,0.4)'; }}
        >
          {t.cta.button}
        </button>
        <div className="mt-14 flex items-center gap-3">
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/SAP_2011_logo.svg/1280px-SAP_2011_logo.svg.png" alt="SAP" style={{ height: 14, opacity: 0.25 }} />
          <span className="text-[11px] font-mono" style={{ color: 'var(--text-ghost)' }}>{t.cta.footer}</span>
        </div>
      </section>

    </div>
  );
}
