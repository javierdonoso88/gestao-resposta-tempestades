import React, { useState } from 'react';
import { SimParams, DroliusStatus } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../i18n';

interface Props {
  params: SimParams;
  onChange: (p: Partial<SimParams>) => void;
  onSimulate: () => void;
  running: boolean;
  kpi: { sla: number | null; safety: number | null; efficiency: number | null; tiepi: number | null; mttr: number | null };
  drolius: { status: DroliusStatus; task?: string };
}

const storm2Options: SimParams['storm2Window'][] = ['T+4h', 'T+6h', 'T+8h', 'none'];

function TooltipLabel({ label, tip }: { label: string; tip: string }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  return (
    <div
      className="flex items-center gap-1 min-w-0 cursor-default"
      onMouseEnter={e => {
        const r = e.currentTarget.getBoundingClientRect();
        setPos({ x: r.right + 10, y: r.top + r.height / 2 });
      }}
      onMouseLeave={() => setPos(null)}
    >
      <span className="text-xs font-medium truncate text-slate-400">{label}</span>
      <span className="text-[10px] flex-shrink-0 select-none text-slate-600">ⓘ</span>
      {pos && (
        <div
          className="fixed w-52 z-[9999] pointer-events-none"
          style={{ left: pos.x, top: pos.y, transform: 'translateY(-50%)' }}
        >
          <div className="rounded-lg px-3 py-2.5 text-[11px] leading-relaxed shadow-2xl" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-accent)', color: 'var(--text-secondary)' }}>
            {tip}
          </div>
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent" style={{ borderRightColor: 'var(--border-accent)' }} />
        </div>
      )}
    </div>
  );
}

export function ParametersPanel({ params, onChange, onSimulate, running, kpi, drolius }: Props) {
  const [showInfo, setShowInfo] = useState(false);
  const { theme } = useTheme();
  const t = useT();
  const isLight = theme !== 'dark';

  const droliusColor = drolius.status === 'available' ? '#22c55e' : '#f97316';
  const droliusLabel = drolius.status === 'available' ? 'DISPONIBLE'
    : `EN CAMPO · ${drolius.task ?? ''}`;

  return (
    <div className="flex flex-col h-full">

      {/* Context block */}
      <div className="mx-3 mt-3 rounded-lg p-3 flex flex-col gap-2" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
            <span className="text-[10px] font-bold tracking-widest" style={{ color: '#ef4444' }}>{t.params.incident}</span>
          </div>
          <button
            onClick={() => setShowInfo(true)}
            className="text-[10px] font-medium px-2 py-0.5 rounded transition-colors"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--border-accent)', background: 'var(--bg-secondary)', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = '#3b82f6'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-accent)'; }}
          >
            {t.params.moreInfo}
          </button>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {t.params.incidentBody}
        </p>
      </div>

      {/* Info modal */}
      {showInfo && <IncidentInfoModal onClose={() => setShowInfo(false)} />}

      {/* Drolius status */}
      <div
        className="mx-3 mt-2 rounded-lg px-3 py-2 flex items-center gap-2"
        style={{ background: 'var(--bg-secondary)', border: `1px solid rgba(${droliusColor === '#22c55e' ? '34,197,94' : '249,115,22'},0.2)` }}
      >
        <img src="/anybotics.png" alt="Drolius" style={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0 }} title="Drolius — robot de inspección" />
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: droliusColor, animation: drolius.status !== 'available' ? 'pulse 1s infinite' : 'none' }} />
            <span className="text-[10px] font-bold tracking-wider truncate" style={{ color: droliusColor }}>
              DROLIUS · {droliusLabel}
            </span>
          </div>
          <span className="text-[10px]" style={{ color: 'var(--text-ghost)' }}>
            {drolius.status === 'available' ? t.params.droluisAvailable : t.params.droluisRunning}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-3 flex-1 overflow-y-auto">

        {/* SLA */}
        <SliderField
          label={t.params.sla}
          tip={t.params.slaTip}
          value={`${params.minuteSLA} min`}
          valueColor={params.minuteSLA < 45 ? '#ef4444' : '#3b82f6'}
          min={30} max={120} step={5}
          current={params.minuteSLA}
          onChange={v => onChange({ minuteSLA: v })}
          accent={params.minuteSLA < 45 ? '#ef4444' : '#3b82f6'}
        />

        {/* Switchable faults */}
        <SliderField
          label={t.params.switchable}
          tip={t.params.switchableTip}
          value={String(params.switchableFaults)}
          valueColor={params.switchableFaults < 15 ? '#f97316' : '#3b82f6'}
          min={5} max={22} step={1}
          current={params.switchableFaults}
          onChange={v => onChange({ switchableFaults: v })}
          accent={params.switchableFaults < 15 ? '#f97316' : '#3b82f6'}
        />

        {/* Limited parts toggle */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <TooltipLabel
              label={t.params.limitedParts}
              tip={t.params.limitedPartsTip}
            />
            <button
              onClick={() => onChange({ limitedParts: params.limitedParts === 1 ? 0 : 1 })}
              className="relative w-9 h-5 flex-shrink-0 rounded-full transition-colors duration-200 border"
              style={{
                background: params.limitedParts === 1 ? 'var(--accent)' : isLight ? '#c4cdd9' : '#334155',
                borderColor: params.limitedParts === 1 ? 'var(--accent)' : isLight ? '#b0bec8' : '#475569',
              }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200 bg-white shadow-sm"
                style={{ left: params.limitedParts === 1 ? '16px' : '2px' }}
              />
            </button>
          </div>
          {params.limitedParts === 1 && (
            <div className="text-[12px] rounded px-2 py-1 border" style={{ color: 'var(--status-running-color)', background: 'var(--status-running-bg)', borderColor: isLight ? 'rgba(194,65,12,0.25)' : '#7c2d12' }}>
              {t.params.limitedPartsOn}
            </div>
          )}
        </div>

        {/* Crews */}
        <SliderField
          label={t.params.crews}
          tip={t.params.crewsTip}
          value={String(params.availableCrews)}
          valueColor="#22c55e"
          min={8} max={22} step={1}
          current={params.availableCrews}
          onChange={v => onChange({ availableCrews: v })}
          accent="#22c55e"
        />

        {/* Storm window */}
        <div className="flex flex-col gap-1.5">
          <TooltipLabel
            label={t.params.storm2}
            tip="Tiempo disponible antes de la segunda tormenta."
          />
          <div className="grid grid-cols-2 gap-1">
            {storm2Options.map(opt => (
              <button
                key={opt}
                onClick={() => onChange({ storm2Window: opt })}
                className="text-[12px] py-1 px-2 rounded border transition-all font-mono"
                style={
                  params.storm2Window === opt
                    ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)', cursor: 'pointer' }
                    : { background: 'var(--border)', color: 'var(--text-muted)', borderColor: 'var(--text-ghost)', cursor: 'pointer' }
                }
              >
                {opt === 'none' ? t.params.noStorm : opt}
              </button>
            ))}
          </div>
        </div>

        {/* Operator instructions */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold tracking-widest" style={{ color: 'var(--text-dim)' }}>{t.params.operatorInstructions}</span>
          <textarea
            value={params.instructions ?? ''}
            onChange={e => onChange({ instructions: e.target.value })}
            placeholder={t.params.operatorPlaceholder}
            rows={4}
            className="w-full rounded-lg text-[11px] leading-relaxed resize-none outline-none p-2.5"
            style={{
              background: 'var(--bg-base)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              caretColor: 'var(--accent)',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          />
          <span className="text-[10px]" style={{ color: 'var(--text-ghost)' }}>
            {t.params.operatorHint}
          </span>
        </div>

        {/* Simulate */}
        <button onClick={onSimulate} disabled={running} className="btn-primary w-full mt-1">
          {running ? (
            <>
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {t.params.simulating}
            </>
          ) : t.params.simulate}
        </button>

        {/* KPIs */}
        <div className="border-t pt-3 flex flex-col gap-2.5" style={{ borderColor: 'var(--border)' }}>
          <span className="text-[13px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{t.params.kpis}</span>
          <KPIRow label={t.params.slaKpi} sub={t.params.slaSub} value={kpi.sla} color={kpi.sla === null ? 'var(--text-ghost)' : kpi.sla >= 80 ? '#22c55e' : kpi.sla >= 60 ? '#f97316' : '#ef4444'} />
          <KPIRow label={t.params.safety} sub={t.params.safetySub} value={kpi.safety} color={kpi.safety === null ? 'var(--text-ghost)' : kpi.safety === 100 ? '#22c55e' : kpi.safety >= 70 ? '#f97316' : '#ef4444'} />
          <KPIRow label={t.params.efficiency} sub={t.params.efficiencySub} value={kpi.efficiency} color={kpi.efficiency === null ? 'var(--text-ghost)' : kpi.efficiency >= 80 ? '#22c55e' : kpi.efficiency >= 60 ? '#f97316' : '#ef4444'} />
          <KPIMinuteRow label={t.params.tiepi} sub={t.params.tiepiSub} value={kpi.tiepi} color={kpi.tiepi === null ? 'var(--text-ghost)' : kpi.tiepi <= 60 ? '#22c55e' : kpi.tiepi <= 120 ? '#f97316' : '#ef4444'} />
          <KPIMinuteRow label={t.params.mttr} sub={t.params.mttrSub} value={kpi.mttr} color={kpi.mttr === null ? 'var(--text-ghost)' : kpi.mttr <= 60 ? '#22c55e' : kpi.mttr <= 120 ? '#f97316' : '#ef4444'} />
        </div>

      </div>
    </div>
  );
}

function SliderField({ label, tip, value, valueColor, min, max, step, current, onChange, accent }: {
  label: string; tip: string; value: string; valueColor: string;
  min: number; max: number; step: number; current: number;
  onChange: (v: number) => void; accent: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center gap-2">
        <TooltipLabel label={label} tip={tip} />
        <span className="text-xs font-bold font-mono flex-shrink-0" style={{ color: valueColor }}>{value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={current}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: accent, background: 'var(--border)' }}
      />
      <div className="flex justify-between text-[12px]" style={{ color: 'var(--text-ghost)' }}>
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
}

function KPIMinuteRow({ label, sub, value, color }: { label: string; sub: string; value: number | null; color: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <div className="flex flex-col">
        <span className="text-[12px] font-semibold text-slate-400">{label}</span>
        <span className="text-[13px] text-slate-600">{sub}</span>
      </div>
      <span className="text-[13px] font-bold font-mono whitespace-nowrap" style={{ color }}>
        {value === null ? '—' : `${value} min`}
      </span>
    </div>
  );
}

function KPIRow({ label, sub, value, color }: { label: string; sub: string; value: number | null; color: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <div className="flex flex-col">
          <span className="text-[12px] font-semibold text-slate-400">{label}</span>
          <span className="text-[13px] text-slate-600">{sub}</span>
        </div>
        <span className="text-[13px] font-bold font-mono" style={{ color }}>
          {value === null ? '—' : `${value}%`}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        {value !== null && (
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
        )}
      </div>
    </div>
  );
}

function IncidentInfoModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  const m = t.modal;
  const urgencyColor = (u: string) =>
    u === m.urgencyCritical ? '#fca5a5' : u === m.urgencyHigh ? '#fdba74' : u === m.urgencyMedium ? '#fde68a' : 'var(--text-secondary)';
  const urgencyBg = (u: string) =>
    u === m.urgencyCritical ? 'rgba(239,68,68,0.15)' : u === m.urgencyHigh ? 'rgba(249,115,22,0.15)' : u === m.urgencyMedium ? 'rgba(250,204,21,0.12)' : 'rgba(148,163,184,0.1)';

  const criticalSites = [
    { id: 'TRF-002', site: 'Estação de Bombagem EPAL — Loures', type: m.siteWater, battery: 30, urgency: m.urgencyCritical },
    { id: 'TRF-003', site: 'NephroCare — Clínica de Hemodiálise Almada', type: m.siteHealth, battery: 60, urgency: m.urgencyCritical },
    { id: 'TRF-004', site: 'Hospital Garcia de Orta — Almada', type: m.siteHospital, battery: 120, urgency: m.urgencyHigh },
    { id: 'TRF-006', site: 'Hospital Fernando Fonseca — Amadora', type: m.siteHospital, battery: 180, urgency: m.urgencyHigh },
    { id: 'TRF-001', site: 'Hospital de Santa Maria', type: m.siteHospital, battery: 240, urgency: m.urgencyMedium },
    { id: 'TRF-007', site: 'Quartel Bombeiros Voluntários de Setúbal', type: m.siteEmergency, battery: 360, urgency: m.urgencyMedium },
    { id: 'TRF-005', site: 'Data Center — Zona Industrial de Sintra', type: m.siteDataCenter, battery: 480, urgency: m.urgencyLow },
  ];

  const tensions = [
    { label: m.tension1Label, desc: m.tension1Desc, color: '#ef4444' },
    { label: m.tension2Label, desc: m.tension2Desc, color: '#f97316' },
    { label: m.tension3Label, desc: m.tension3Desc, color: '#facc15' },
    { label: m.tension4Label, desc: m.tension4Desc, color: '#8b5cf6' },
  ];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'var(--bg-overlay)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl shadow-2xl flex flex-col"
        style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-accent)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[13px] font-bold tracking-widest" style={{ color: '#ef4444' }}>{m.title}</span>
            <span className="text-[11px] font-mono" style={{ color: 'var(--text-ghost)' }}>{m.subtitle}</span>
          </div>
          <button onClick={onClose} className="text-lg leading-none w-6 h-6 flex items-center justify-center rounded transition-colors" style={{ color: 'var(--text-muted)', cursor: 'pointer' }}>×</button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-6">

          {/* Summary */}
          <div className="rounded-lg p-4 flex flex-col gap-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <InfoSectionTitle>{m.summaryTitle}</InfoSectionTitle>
            <div className="grid grid-cols-3 gap-3">
              <StatBox value="143.000" label={m.summaryClients} color="#ef4444" />
              <StatBox value="47" label={m.summaryFaults} color="#f97316" />
              <StatBox value="7" label={m.summaryCritical} color="#facc15" />
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{m.summaryBody}</p>
          </div>

          {/* Critical sites */}
          <div className="flex flex-col gap-3">
            <InfoSectionTitle>{m.criticalTitle}</InfoSectionTitle>
            <p className="text-[11px]" style={{ color: 'var(--text-dim)' }}>{m.criticalSubtitle}</p>
            <div className="flex flex-col gap-1.5">
              {criticalSites.map(s => (
                <div key={s.id} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <span className="text-[10px] font-mono w-16 flex-shrink-0" style={{ color: 'var(--text-ghost)' }}>{s.id}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium truncate" style={{ color: 'var(--text-secondary)' }}>{s.site}</div>
                    <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{s.type}</div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[11px] font-mono font-bold" style={{ color: s.battery <= 60 ? '#ef4444' : s.battery <= 180 ? '#f97316' : 'var(--text-muted)' }}>{s.battery} min</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide" style={{ color: urgencyColor(s.urgency), background: urgencyBg(s.urgency) }}>{s.urgency}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fault types */}
          <div className="flex flex-col gap-3">
            <InfoSectionTitle>{m.faultTypesTitle}</InfoSectionTitle>
            <div className="grid grid-cols-3 gap-3">
              <FaultTypeBox count={22} label={m.faultSwitchable} desc={m.faultSwitchableDesc} color="#3b82f6" />
              <FaultTypeBox count={7} label={m.faultTransformer} desc={m.faultTransformerDesc} color="#f97316" />
              <FaultTypeBox count={18} label={m.faultCable} desc={m.faultCableDesc} color="#8b5cf6" />
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-dim)' }}>{m.faultParamNote}</p>
          </div>

          {/* Resources */}
          <div className="flex flex-col gap-3">
            <InfoSectionTitle>{m.resourcesTitle}</InfoSectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg p-3 flex flex-col gap-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <span className="text-[10px] font-bold tracking-widest" style={{ color: '#22c55e' }}>{m.crewBases}</span>
                {[{ base: 'Lisboa/Chelas', n: 7 }, { base: 'Sintra', n: 4 }, { base: 'Cascais', n: 3 }, { base: 'Almada', n: 3 }, { base: 'Setúbal', n: 3 }, { base: 'Loures', n: 2 }].map(b => (
                  <div key={b.base} className="flex items-center justify-between">
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{b.base}</span>
                    <span className="text-[11px] font-mono font-bold" style={{ color: 'var(--text-dim)' }}>{b.n}</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>{m.totalMax}</span>
                  <span className="text-[11px] font-mono font-bold" style={{ color: '#22c55e' }}>22</span>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <div className="rounded-lg p-3 flex flex-col gap-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <span className="text-[10px] font-bold tracking-widest" style={{ color: '#22c55e' }}>{m.inventory}</span>
                  <MaterialRow label={m.matTransformers} value="2 ud" note={m.matTransNote} />
                  <MaterialRow label={m.matCables} value="40 ud" note={m.matCableNote} />
                  <MaterialRow label={m.matGenerator} value="1 ud" note={m.matGenNote} />
                  <div className="mt-1 rounded p-2 text-[10px] leading-relaxed" style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', color: '#f97316' }}>
                    {m.limitedPartsWarning}
                  </div>
                </div>
                <div className="rounded-lg p-3 flex flex-col gap-2" style={{ background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.2)' }}>
                  <div className="flex items-center gap-2">
                    <img src="/anybotics.png" alt="Drolius" style={{ width: 20, height: 20, objectFit: 'contain' }} />
                    <span className="text-[10px] font-bold tracking-widest" style={{ color: '#a78bfa' }}>{m.droliusTitle}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: '#6d5acd' }}>{m.droliusBody}</p>
                  <div className="flex flex-col gap-1 mt-0.5">
                    {[
                      { icon: '🔋', text: 'battery_check — confirma bateria UPS/SAI restante' },
                      { icon: '🗺️', text: 'zone_access — avalia acessibilidade para brigada (EN9, Arrábida)' },
                      { icon: '🔍', text: 'damage_assessment — documenta danos no ativo' },
                    ].map(mi => (
                      <div key={mi.text} className="flex items-start gap-1.5 text-[10px]" style={{ color: 'var(--text-dim)' }}>
                        <span className="flex-shrink-0" style={{ fontSize: '10px' }}>{mi.icon}</span>
                        <span>{mi.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tensions */}
          <div className="flex flex-col gap-3">
            <InfoSectionTitle>{m.tensionsTitle}</InfoSectionTitle>
            <div className="flex flex-col gap-2">
              {tensions.map(ten => (
                <div key={ten.label} className="flex gap-3 rounded-lg px-3 py-2.5" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <div className="w-1.5 rounded-full flex-shrink-0 mt-0.5" style={{ background: ten.color, minHeight: '16px' }} />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{ten.label}</span>
                    <span className="text-[11px] leading-relaxed" style={{ color: 'var(--text-dim)' }}>{ten.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function InfoSectionTitle({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: 'var(--text-dim)' }}>{children}</span>;
}

function StatBox({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="rounded-lg p-3 flex flex-col gap-1 text-center" style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
      <span className="text-[20px] font-bold font-mono leading-none" style={{ color }}>{value}</span>
      <span className="text-[10px] leading-tight" style={{ color: 'var(--text-dim)' }}>{label}</span>
    </div>
  );
}

function FaultTypeBox({ count, label, desc, color }: { count: number; label: string; desc: string; color: string }) {
  return (
    <div className="rounded-lg p-3 flex flex-col gap-1.5" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
      <span className="text-[22px] font-bold font-mono leading-none" style={{ color }}>{count}</span>
      <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-[10px] leading-tight" style={{ color: 'var(--text-ghost)' }}>{desc}</span>
    </div>
  );
}

function MaterialRow({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span className="text-[11px] font-mono font-bold" style={{ color: 'var(--text-secondary)' }}>{value}</span>
      </div>
      <span className="text-[10px]" style={{ color: 'var(--text-ghost)' }}>{note}</span>
    </div>
  );
}
