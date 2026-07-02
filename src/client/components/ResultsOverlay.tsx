import React, { useEffect, useState } from 'react';
import { ActionMessage, AgentLog, CommsMessage, ConflictEvent, Fault, KPIState } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../i18n';

interface Props {
  faults: Fault[];
  totalClients: number;
  kpi: KPIState;
  agentLogs: AgentLog[];
  commsMessages: CommsMessage[];
  actionMessages: ActionMessage[];
  conflicts: ConflictEvent[];
  elapsedLabel: string;
  onClose: () => void;
}

function hexToRgb(hex: string) {
  return `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`;
}

function kpiColor(v: number) {
  return v >= 80 ? '#22c55e' : v >= 60 ? '#f97316' : '#ef4444';
}

function kpiGrade(v: number) {
  return v >= 80 ? 'ÓPTIMO' : v >= 60 ? 'ACEPTABLE' : 'CRÍTICO';
}

function safetyColor(v: number) {
  return v === 100 ? '#22c55e' : v >= 70 ? '#f97316' : '#ef4444';
}

function safetyGrade(v: number) {
  return v === 100 ? 'ÓPTIMO' : v >= 70 ? 'ACEPTABLE' : 'CRÍTICO';
}

function stripEmoji(text: string): string {
  return text.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{1F300}-\u{1FAFF}]/gu, '').trim();
}

function renderMarkdown(raw: string) {
  const lines = raw
    .replace(/^[=\-]{3,}\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n');

  const nodes: React.ReactNode[] = [];
  let key = 0;

  const renderInline = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`[^`]+`)/g);
    return parts.map((p, i) => {
      if (p.startsWith('**') && p.endsWith('**'))
        return <strong key={i} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{p.slice(2, -2)}</strong>;
      if (p.startsWith('*') && p.endsWith('*'))
        return <em key={i} style={{ color: 'var(--text-secondary)' }}>{p.slice(1, -1)}</em>;
      if (p.startsWith('`') && p.endsWith('`'))
        return <code key={i} className="px-1 rounded text-xs font-mono" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>{p.slice(1, -1)}</code>;
      return p;
    });
  };

  let i = 0;
  while (i < lines.length) {
    const line = stripEmoji(lines[i]);

    if (!line) { i++; continue; }

    // H2 / H3
    if (/^#{2,3}\s+/.test(line)) {
      const text = line.replace(/^#{2,3}\s+/, '');
      nodes.push(
        <div key={key++} className="text-[10px] font-black tracking-widest mt-4 mb-1.5 first:mt-0" style={{ color: 'var(--accent)' }}>
          {text.toUpperCase()}
        </div>
      );
      i++; continue;
    }

    // H1
    if (/^#\s+/.test(line)) {
      const text = line.replace(/^#\s+/, '');
      nodes.push(
        <div key={key++} className="text-xs font-black tracking-widest mt-4 mb-2 first:mt-0" style={{ color: 'var(--accent)' }}>
          {text.toUpperCase()}
        </div>
      );
      i++; continue;
    }

    // Bullet list — collect consecutive items
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(stripEmoji(lines[i]))) {
        items.push(stripEmoji(lines[i]).replace(/^[-*]\s+/, ''));
        i++;
      }
      nodes.push(
        <ul key={key++} className="flex flex-col gap-1 my-1.5 ml-1">
          {items.map((item, j) => (
            <li key={j} className="flex gap-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <span className="mt-[6px] w-1 h-1 rounded-full flex-shrink-0" style={{ background: 'var(--text-ghost)' }} />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line)) {
      nodes.push(<div key={key++} className="my-3" style={{ height: 1, background: 'var(--border)' }} />);
      i++; continue;
    }

    // Paragraph — collect until blank line or next block element
    const paraLines: string[] = [];
    while (i < lines.length) {
      const l = stripEmoji(lines[i]);
      if (!l) break;
      if (/^#{1,6}\s/.test(l) || /^[-*]\s/.test(l) || /^---+$/.test(l)) break;
      paraLines.push(l);
      i++;
    }
    if (paraLines.length) {
      nodes.push(
        <p key={key++} className="text-sm leading-relaxed my-1" style={{ color: 'var(--text-secondary)' }}>
          {renderInline(paraLines.join(' '))}
        </p>
      );
    } else {
      i++; // safety: skip unrecognised line to avoid infinite loop
    }
  }

  return nodes;
}

function getMitigation(fault: Fault, t: ReturnType<typeof import('../i18n').useT>): { action: string; urgency: 'high' | 'medium' | 'low' } {
  if (fault.criticalSite) {
    return {
      action: `${t.results.mitigationCritical}${fault.batteryMinutes != null ? ` ${fault.batteryMinutes} min.` : ''}`,
      urgency: 'high',
    };
  }
  if (fault.type === 'transformer') {
    return { action: t.results.mitigationTransformer, urgency: 'medium' };
  }
  if (fault.type === 'cable') {
    return { action: t.results.mitigationCable, urgency: 'medium' };
  }
  return { action: t.results.mitigationSwitchable, urgency: 'low' };
}

const URGENCY_COLOR = { high: '#ef4444', medium: '#f97316', low: '#f59e0b' };

function MinuteKpiCard({ label, sublabel, value, thresholds, gradLabels }: { label: string; sublabel: string; value: number | null; thresholds: [number, number]; gradLabels?: [string, string, string] }) {
  const color = value === null ? 'var(--text-ghost)' : value <= thresholds[0] ? '#22c55e' : value <= thresholds[1] ? '#f97316' : '#ef4444';
  const [g0, g1, g2] = gradLabels ?? ['ÓPTIMO', 'ACEPTABLE', 'CRÍTICO'];
  const grade = value === null ? '' : value <= thresholds[0] ? g0 : value <= thresholds[1] ? g1 : g2;
  return (
    <div className="flex items-center gap-4 flex-1">
      <div>
        <div className="text-[10px] font-black tracking-widest mb-0.5" style={{ color: 'var(--text-dim)' }}>{label}</div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black font-mono" style={{ color }}>{value === null ? '—' : value}</span>
          {value !== null && <span className="text-base font-bold" style={{ color }}>min</span>}
        </div>
        {grade && <div className="text-[10px] font-black tracking-widest mt-0.5" style={{ color }}>{grade}</div>}
      </div>
      <div className="text-[11px] leading-relaxed max-w-[180px]" style={{ color: 'var(--text-ghost)' }}>{sublabel}</div>
    </div>
  );
}

function KpiBlock({ value, label, colorFn = kpiColor, gradeFn = kpiGrade }: { value: number; label: string; colorFn?: (v: number) => string; gradeFn?: (v: number) => string }) {
  const color = colorFn(value);
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-3 flex-1">
      <div className="relative flex items-center justify-center" style={{ width: 130, height: 130 }}>
        <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="65" cy="65" r={r} fill="none" strokeWidth="10" style={{ stroke: 'var(--border)' }} />
          <circle
            cx="65" cy="65" r={r} fill="none"
            stroke={color} strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ filter: `drop-shadow(0 0 6px ${color}88)`, transition: 'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-3xl font-black leading-none" style={{ color }}>{value}%</span>
          <span className="text-[10px] font-black tracking-widest mt-1" style={{ color }}>{gradeFn(value)}</span>
        </div>
      </div>
      <span className="text-[10px] font-bold tracking-widest" style={{ color: 'var(--text-dim)' }}>{label}</span>
    </div>
  );
}

function SapKpiCard({ system, value, label, color }: { system: string; value: string | number; label: string; color: string }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1.5" style={{ background: `rgba(${hexToRgb(color)},0.06)`, border: `1px solid rgba(${hexToRgb(color)},0.2)` }}>
      <div className="text-[10px] font-mono truncate" style={{ color: `rgba(${hexToRgb(color)},0.6)` }}>{system}</div>
      <div className="text-3xl font-black" style={{ color }}>{value}</div>
      <div className="text-[11px] font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{label}</div>
    </div>
  );
}

export function ResultsOverlay({ faults, totalClients, kpi, agentLogs, commsMessages, actionMessages, conflicts, elapsedLabel, onClose }: Props) {
  const [vis, setVis] = useState(false);
  const { theme } = useTheme();
  const t = useT();
  useEffect(() => { const t = setTimeout(() => setVis(true), 50); return () => clearTimeout(t); }, []);

  function downloadReport() {
    const orchLog = agentLogs.find(l => l.agent === 'orchestrator');
    const orchPlain = (orchLog?.text ?? '')
      .replace(/^#{1,6}\s*/gm, '')
      .replace(/\*\*(.*?)\*\*/gs, '$1')
      .replace(/\*(.*?)\*/gs, '$1')
      .replace(/^[=\-]{3,}\s*$/gm, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{1F300}-\u{1FAFF}]/gu, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const pendingRows = [...faults].filter(f => f.status === 'fault')
      .sort((a, b) => {
        if (a.criticalSite && !b.criticalSite) return -1;
        if (!a.criticalSite && b.criticalSite) return 1;
        return b.affectedClients - a.affectedClients;
      });

    const restored = faults.filter(f => f.status === 'restored');
    const enRoute = faults.filter(f => f.status === 'crew-en-route');
    const attended = restored.length + enRoute.length;
    const attendedClients = [...restored, ...enRoute].reduce((s, f) => s + f.affectedClients, 0);
    const criticals = faults.filter(f => f.criticalSite);
    const criticalsCovered = criticals.filter(f => f.status !== 'fault');

    // language-agnostic KPI counters (same logic as main view)
    const pdfFsmActions = actionMessages.filter(a => a.system === 'SAP Field Service Management').length;
    const pdfIbpMaterials = actionMessages.filter(a => a.system === 'SAP Integrated Business Planning' && !a.msg.toLowerCase().includes('replen') && !a.msg.toLowerCase().includes('reposición')).length;
    const pdfDrolius = actionMessages.filter(a => a.system === 'Drolius · ANYbotics' && (a.msg.toLowerCase().includes('deployed') || a.msg.toLowerCase().includes('asignado'))).length;

    const pdfGrade = (v: number) => v >= 80 ? t.results.gradOptimal : v >= 60 ? t.results.gradAcceptable : t.results.gradCritical;
    const pdfSafetyGrade = (v: number) => v === 100 ? t.results.gradOptimal : v >= 70 ? t.results.gradAcceptable : t.results.gradCritical;
    const pdfUrgency = { high: t.results.urgencyCritical, medium: t.results.urgencyModerate, low: t.results.urgencyLow };

    const faultTypeLabel = (type: string) =>
      type === 'transformer' ? (t.map.typeTransformer) : type === 'cable' ? t.map.typeCable : t.map.typeSwitchable;
    const clientsWord = t.map.tooltipClients.replace(':', '').toLowerCase();

    const html = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8"/>
<title>${t.results.pdfTitle} — ${t.app.title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #1e293b; padding: 32px 40px; font-size: 13px; }
  h1 { font-size: 22px; font-weight: 900; color: #0f172a; margin-bottom: 2px; }
  .subtitle { color: #64748b; font-size: 11px; margin-bottom: 28px; }
  .section-label { font-size: 9px; font-weight: 800; letter-spacing: 0.12em; color: #94a3b8; text-transform: uppercase; margin-bottom: 10px; margin-top: 24px; }
  .kpi-row { display: flex; gap: 16px; margin-bottom: 4px; }
  .kpi-box { flex: 1; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; text-align: center; }
  .kpi-value { font-size: 32px; font-weight: 900; }
  .kpi-grade { font-size: 9px; font-weight: 800; letter-spacing: 0.1em; margin-top: 2px; }
  .kpi-label { font-size: 10px; color: #94a3b8; margin-top: 6px; font-weight: 600; letter-spacing: 0.05em; }
  .duration-box { border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; text-align: center; min-width: 120px; }
  .duration-value { font-size: 28px; font-weight: 900; color: #0891b2; font-family: monospace; }
  .duration-label { font-size: 10px; color: #94a3b8; margin-top: 4px; font-weight: 600; letter-spacing: 0.05em; }
  .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .stat-box { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
  .stat-value { font-size: 24px; font-weight: 900; }
  .stat-unit { font-size: 12px; font-weight: 700; color: #94a3b8; margin-left: 3px; }
  .stat-label { font-size: 11px; font-weight: 700; color: #1e293b; margin-top: 3px; }
  .stat-sub { font-size: 10px; color: #94a3b8; margin-top: 2px; }
  .sap-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .sap-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
  .sap-system { font-size: 9px; font-family: monospace; color: #94a3b8; margin-bottom: 4px; }
  .sap-value { font-size: 24px; font-weight: 900; }
  .sap-label { font-size: 10px; font-weight: 600; color: #334155; margin-top: 2px; }
  .narrative { border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; line-height: 1.7; color: #334155; white-space: pre-wrap; }
  .pending-row { border: 1px solid #fde68a; border-radius: 8px; padding: 12px 14px; margin-bottom: 8px; display: flex; gap: 14px; align-items: flex-start; }
  .pending-badge { font-size: 9px; font-weight: 800; padding: 3px 7px; border-radius: 4px; white-space: nowrap; margin-top: 1px; }
  .pending-id { font-size: 12px; font-weight: 900; color: #0f172a; }
  .pending-meta { font-size: 10px; color: #94a3b8; margin-top: 1px; }
  .pending-action { font-size: 11px; color: #475569; margin-top: 5px; line-height: 1.5; }
  .footer { margin-top: 36px; padding-top: 14px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; color: #94a3b8; font-size: 10px; }
  .badge-green { background: #dcfce7; color: #16a34a; }
  .badge-orange { background: #ffedd5; color: #ea580c; }
  .badge-red { background: #fee2e2; color: #dc2626; }
  @media print { body { padding: 20px 28px; } }
</style>
</head>
<body>
  <h1>${t.results.pdfTitle}</h1>
  <div class="subtitle">${t.app.title} · Área Metropolitana de Lisboa · ${t.results.completed} · ${elapsedLabel}</div>

  <div class="section-label">${t.results.pdfKpis}</div>
  <div class="kpi-row">
    <div class="kpi-box">
      <div class="kpi-value" style="color:${kpiColor(kpi.sla ?? 0)}">${kpi.sla}%</div>
      <div class="kpi-grade" style="color:${kpiColor(kpi.sla ?? 0)}">${pdfGrade(kpi.sla ?? 0)}</div>
      <div class="kpi-label">${t.results.kpiSla}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-value" style="color:${safetyColor(kpi.safety ?? 0)}">${kpi.safety}%</div>
      <div class="kpi-grade" style="color:${safetyColor(kpi.safety ?? 0)}">${pdfSafetyGrade(kpi.safety ?? 0)}</div>
      <div class="kpi-label">${t.results.kpiSafety}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-value" style="color:${kpiColor(kpi.efficiency ?? 0)}">${kpi.efficiency}%</div>
      <div class="kpi-grade" style="color:${kpiColor(kpi.efficiency ?? 0)}">${pdfGrade(kpi.efficiency ?? 0)}</div>
      <div class="kpi-label">${t.results.kpiEfficiency}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-value" style="color:${kpi.tiepi != null && kpi.tiepi <= 60 ? '#16a34a' : kpi.tiepi != null && kpi.tiepi <= 120 ? '#ea580c' : '#dc2626'}">${kpi.tiepi ?? '—'}<span style="font-size:14px;font-weight:600"> min</span></div>
      <div class="kpi-grade" style="color:${kpi.tiepi != null && kpi.tiepi <= 60 ? '#16a34a' : kpi.tiepi != null && kpi.tiepi <= 120 ? '#ea580c' : '#dc2626'}">${kpi.tiepi != null ? pdfGrade(kpi.tiepi <= 60 ? 90 : kpi.tiepi <= 120 ? 70 : 40) : ''}</div>
      <div class="kpi-label">${t.results.tiepi}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-value" style="color:${kpi.mttr != null && kpi.mttr <= 60 ? '#16a34a' : kpi.mttr != null && kpi.mttr <= 120 ? '#ea580c' : '#dc2626'}">${kpi.mttr ?? '—'}<span style="font-size:14px;font-weight:600"> min</span></div>
      <div class="kpi-grade" style="color:${kpi.mttr != null && kpi.mttr <= 60 ? '#16a34a' : kpi.mttr != null && kpi.mttr <= 120 ? '#ea580c' : '#dc2626'}">${kpi.mttr != null ? pdfGrade(kpi.mttr <= 60 ? 90 : kpi.mttr <= 120 ? 70 : 40) : ''}</div>
      <div class="kpi-label">${t.results.mttr}</div>
    </div>
    <div class="duration-box">
      <div class="duration-value">${elapsedLabel}</div>
      <div class="duration-label">${t.results.duration}</div>
    </div>
  </div>

  <div class="section-label">${t.results.pdfOperational}</div>
  <div class="stat-grid">
    <div class="stat-box">
      <div><span class="stat-value" style="color:#16a34a">${attendedClients.toLocaleString('es-ES')}</span><span class="stat-unit">/ ${totalClients.toLocaleString('es-ES')}</span></div>
      <div class="stat-label">${t.results.clientsServed}</div>
      <div class="stat-sub">${Math.round(attendedClients / totalClients * 100)}%</div>
    </div>
    <div class="stat-box">
      <div><span class="stat-value" style="color:#2563eb">${attended}</span><span class="stat-unit">/ ${faults.length}</span></div>
      <div class="stat-label">${t.results.faultsHandled}</div>
    </div>
    <div class="stat-box">
      <div><span class="stat-value" style="color:${criticalsCovered.length === criticals.length ? '#16a34a' : '#dc2626'}">${criticalsCovered.length}</span><span class="stat-unit">/ ${criticals.length}</span></div>
      <div class="stat-label">${t.results.criticalCovered}</div>
    </div>
    <div class="stat-box">
      <div><span class="stat-value" style="color:${pendingRows.length === 0 ? '#16a34a' : '#ea580c'}">${pendingRows.length}</span></div>
      <div class="stat-label">${t.results.pendingActions}</div>
    </div>
  </div>

  <div class="section-label">${t.results.pdfSap}</div>
  <div class="sap-grid">
    <div class="sap-box"><div class="sap-system">SAP AI Core Orchestration</div><div class="sap-value" style="color:#d97706">${new Set(actionMessages.map(a => a.system)).size}</div><div class="sap-label">${t.results.sapSystems}</div></div>
    <div class="sap-box"><div class="sap-system">SAP Field Service Management</div><div class="sap-value" style="color:#2563eb">${pdfFsmActions}</div><div class="sap-label">${t.results.sapWorkOrders}</div></div>
    <div class="sap-box"><div class="sap-system">SAP Asset Intelligence Network</div><div class="sap-value" style="color:#16a34a">${restored.length}</div><div class="sap-label">${t.results.sapSwitches}</div></div>
    <div class="sap-box"><div class="sap-system">SAP Integrated Business Planning</div><div class="sap-value" style="color:#9333ea">${pdfIbpMaterials}</div><div class="sap-label">${t.results.sapMaterials}</div></div>
    <div class="sap-box"><div class="sap-system">SAP Customer Experience</div><div class="sap-value" style="color:#db2777">${commsMessages.length}</div><div class="sap-label">${t.results.sapMessages}</div></div>
    <div class="sap-box"><div class="sap-system">SAP S/4HANA Asset Management</div><div class="sap-value" style="color:#0891b2">${faults.length}</div><div class="sap-label">${t.results.sapAssets}</div></div>
    <div class="sap-box"><div class="sap-system">Drolius · ANYbotics</div><div class="sap-value" style="color:#9333ea">${pdfDrolius}</div><div class="sap-label">${t.results.sapDrolius}</div></div>
  </div>

  ${orchPlain ? `
  <div class="section-label">${t.results.pdfAnalysis}</div>
  <div class="narrative">${orchPlain.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
  ` : ''}

  ${pendingRows.length > 0 ? `
  <div class="section-label">${t.results.pdfPending} (${pendingRows.length})</div>
  ${pendingRows.map(fault => {
    const { action, urgency } = getMitigation(fault, t);
    const bg = urgency === 'high' ? '#fee2e2' : urgency === 'medium' ? '#ffedd5' : '#fef9c3';
    const col = urgency === 'high' ? '#dc2626' : urgency === 'medium' ? '#ea580c' : '#ca8a04';
    const lbl = pdfUrgency[urgency];
    return `<div class="pending-row" style="border-color:${col}33">
      <div class="pending-badge" style="background:${bg};color:${col}">${lbl}</div>
      <div style="flex:1">
        <div class="pending-id">${fault.id} <span style="font-weight:400;color:#64748b;font-size:11px">${fault.zone} · ${faultTypeLabel(fault.type)} · ${fault.affectedClients.toLocaleString()} ${clientsWord}${fault.criticalSite ? ` · ${fault.criticalSite}` : ''}</span></div>
        <div class="pending-action">${action}</div>
      </div>
    </div>`;
  }).join('')}
  ` : ''}

  <div class="footer">
    <span>${t.app.title} · Área Metropolitana de Lisboa</span>
    <span>${t.results.pdfGenerated} ${new Date().toLocaleString('pt-PT')}</span>
  </div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 400);
  }

  // Orchestrator narrative
  const orchLog = agentLogs.find(l => l.agent === 'orchestrator');
  const orchRaw = orchLog?.text ?? '';

  // Operational KPIs
  const restored = faults.filter(f => f.status === 'restored');
  const enRoute = faults.filter(f => f.status === 'crew-en-route');
  const pending = faults.filter(f => f.status === 'fault');
  const attended = restored.length + enRoute.length;
  const attendedClients = [...restored, ...enRoute].reduce((s, f) => s + f.affectedClients, 0);
  const criticals = faults.filter(f => f.criticalSite);
  const criticalsCovered = criticals.filter(f => f.status !== 'fault');
  const criticalsPending = criticals.filter(f => f.status === 'fault');

  // SAP KPIs
  const uniqueSystems = new Set(actionMessages.map(a => a.system)).size;
  const fsmActions = actionMessages.filter(a => a.system === 'SAP Field Service Management').length;
  const ibpMaterials = actionMessages.filter(a => a.system === 'SAP Integrated Business Planning' && !a.msg.toLowerCase().includes('replen') && !a.msg.toLowerCase().includes('reposición')).length;
  const ibpReplenish = actionMessages.filter(a => a.system === 'SAP Integrated Business Planning' && (a.msg.toLowerCase().includes('replen') || a.msg.toLowerCase().includes('reposición'))).length;
  const cxMessages = commsMessages.length;
  const ainSwitches = restored.length;
  const s4Assets = faults.length;
  const droliusMissions = actionMessages.filter(a => a.system === 'Drolius · ANYbotics' && (a.msg.toLowerCase().includes('deployed') || a.msg.toLowerCase().includes('asignado'))).length;

  // Pending actions sorted: critical first, then by clients desc
  const pendingSorted = [...pending].sort((a, b) => {
    if (a.criticalSite && !b.criticalSite) return -1;
    if (!a.criticalSite && b.criticalSite) return 1;
    return b.affectedClients - a.affectedClients;
  });

  const panelShadow = theme === 'joule'
    ? '0 2px 32px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.06)'
    : '0 0 100px rgba(34,211,238,0.07), 0 40px 80px rgba(0,0,0,0.8)';

  const tKpiGrade = (v: number) => v >= 80 ? t.results.gradOptimal : v >= 60 ? t.results.gradAcceptable : t.results.gradCritical;
  const tSafetyGrade = (v: number) => v === 100 ? t.results.gradOptimal : v >= 70 ? t.results.gradAcceptable : t.results.gradCritical;
  const tUrgency = { high: t.results.urgencyCritical, medium: t.results.urgencyModerate, low: t.results.urgencyLow };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'var(--bg-overlay)', backdropFilter: 'blur(14px)', zIndex: 2000, opacity: vis ? 1 : 0, transition: 'opacity 0.3s' }}
    >
      <div
        className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl flex flex-col"
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-accent)',
          boxShadow: panelShadow,
          transform: vis ? 'scale(1)' : 'scale(0.95)',
          transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-black tracking-widest" style={{ color: 'var(--accent)' }}>{t.results.title}</span>
          <span className="text-xs font-mono" style={{ color: 'var(--text-ghost)' }}>·</span>
          <span className="text-xs font-mono" style={{ color: 'var(--text-ghost)' }}>{t.results.completed} · {elapsedLabel}</span>
          <span className="ml-auto text-[11px] font-bold px-3 py-1 rounded-full" style={{ background: '#052e16', color: '#22c55e', border: '1px solid #14532d' }}>
            {t.results.mission}
          </span>
          <button
            onClick={onClose}
            className="ml-3 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-dim)', border: '1px solid var(--border)', cursor: 'pointer' }}
          >✕</button>
        </div>

        <div className="p-6 flex flex-col gap-5">

          {/* ── KPIs ── */}
          <div className="rounded-2xl px-8 py-6 flex flex-col gap-5" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-8">
              <KpiBlock value={kpi.sla ?? 0} label={t.results.kpiSla} gradeFn={tKpiGrade} />
              <div style={{ width: 1, height: 100, background: 'var(--border)', flexShrink: 0 }} />
              <KpiBlock value={kpi.safety ?? 0} label={t.results.kpiSafety} colorFn={safetyColor} gradeFn={tSafetyGrade} />
              <div style={{ width: 1, height: 100, background: 'var(--border)', flexShrink: 0 }} />
              <KpiBlock value={kpi.efficiency ?? 0} label={t.results.kpiEfficiency} gradeFn={tKpiGrade} />
              <div style={{ width: 1, height: 100, background: 'var(--border)', flexShrink: 0 }} />
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className="text-4xl font-black font-mono" style={{ color: 'var(--accent)' }}>{elapsedLabel}</div>
                <div className="text-[10px] font-bold tracking-widest mt-1" style={{ color: 'var(--text-dim)' }}>{t.results.duration}</div>
              </div>
            </div>
            <div style={{ height: 1, background: 'var(--border)' }} />
            <div className="flex items-center gap-10">
              <MinuteKpiCard label={t.results.tiepi} sublabel={t.results.tiepiLong} value={kpi.tiepi} thresholds={[60, 120]} gradLabels={[t.results.gradOptimal, t.results.gradAcceptable, t.results.gradCritical]} />
              <div style={{ width: 1, height: 48, background: 'var(--border)', flexShrink: 0 }} />
              <MinuteKpiCard label={t.results.mttr} sublabel={t.results.mttrLong} value={kpi.mttr} thresholds={[60, 120]} gradLabels={[t.results.gradOptimal, t.results.gradAcceptable, t.results.gradCritical]} />
            </div>
          </div>

          {/* ── Operational stats ── */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { value: attendedClients.toLocaleString('es-ES'), unit: `/ ${totalClients.toLocaleString('es-ES')}`, label: t.results.clientsServed, sub: `${Math.round(attendedClients / totalClients * 100)}%`, color: '#22c55e' },
              { value: `${attended}`, unit: `/ ${faults.length}`, label: t.results.faultsHandled, sub: `${restored.length} · ${enRoute.length}`, color: '#3b82f6' },
              { value: `${criticalsCovered.length}`, unit: `/ ${criticals.length}`, label: t.results.criticalCovered, sub: '', color: criticalsCovered.length === criticals.length ? '#22c55e' : '#ef4444' },
              { value: `${pending.length}`, unit: '', label: t.results.pendingActions, sub: '', color: pending.length === 0 ? '#22c55e' : '#f97316' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-black" style={{ color: s.color }}>{s.value}</span>
                  {s.unit && <span className="text-sm font-bold" style={{ color: 'var(--text-ghost)' }}>{s.unit}</span>}
                </div>
                <div className="text-xs font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>{s.label}</div>
                <div className="text-[11px]" style={{ color: 'var(--text-ghost)' }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* ── SAP Integration KPIs ── */}
          <div>
            <div className="text-[10px] font-bold tracking-widest mb-3" style={{ color: 'var(--text-ghost)' }}>{t.results.sapIntegration}</div>
            <div className="grid grid-cols-3 gap-3">
              <SapKpiCard system="SAP AI Core Orchestration" value={uniqueSystems} label={t.results.sapSystems} color="#f59e0b" />
              <SapKpiCard system="SAP Field Service Management" value={fsmActions} label={t.results.sapWorkOrders} color="#60a5fa" />
              <SapKpiCard system="SAP Asset Intelligence Network" value={ainSwitches} label={t.results.sapSwitches} color="#4ade80" />
              <SapKpiCard system="SAP Integrated Business Planning" value={ibpMaterials} label={`${t.results.sapMaterials}${ibpReplenish > 0 ? ` · ${ibpReplenish} ${t.results.sapReplenish}` : ''}`} color="#c084fc" />
              <SapKpiCard system="SAP Customer Experience" value={cxMessages} label={t.results.sapMessages} color="#f472b6" />
              <SapKpiCard system="SAP S/4HANA Asset Management" value={s4Assets} label={t.results.sapAssets} color="#22d3ee" />
              <SapKpiCard system="Drolius · ANYbotics" value={droliusMissions} label={t.results.sapDrolius} color="#a78bfa" />
            </div>
          </div>

          {/* ── Asset and Services Assistant executive summary ── */}
          <div>
            <div className="text-[10px] font-bold tracking-widest mb-3" style={{ color: 'var(--text-ghost)' }}>{t.results.analysisTitle}</div>
            <div className="rounded-xl px-6 py-5" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              {orchRaw ? (
                <div>{renderMarkdown(orchRaw)}</div>
              ) : (
                <p className="text-sm italic" style={{ color: 'var(--text-ghost)' }}>{t.results.analysisEmpty}</p>
              )}
            </div>
          </div>

          {/* ── Pending actions ── */}
          {pendingSorted.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="text-[10px] font-bold tracking-widest" style={{ color: 'var(--text-ghost)' }}>{t.results.pendingTitle}</div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.25)' }}>
                  {pendingSorted.length} {pendingSorted.length > 1 ? t.results.pendingUnresolvedPlural : t.results.pendingUnresolved}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {pendingSorted.map(fault => {
                  const { action, urgency } = getMitigation(fault, t);
                  const uColor = URGENCY_COLOR[urgency];
                  return (
                    <div key={fault.id} className="rounded-xl p-4 flex gap-4" style={{ background: 'var(--bg-secondary)', border: `1px solid rgba(${hexToRgb(uColor)},0.25)` }}>
                      <div className="flex-shrink-0 mt-0.5">
                        <span className="text-[10px] font-black px-2 py-1 rounded" style={{ background: `rgba(${hexToRgb(uColor)},0.12)`, color: uColor, border: `1px solid rgba(${hexToRgb(uColor)},0.3)` }}>
                          {tUrgency[urgency]}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>{fault.id}</span>
                          <span className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>{fault.zone}</span>
                          <span className="text-xs font-mono" style={{ color: 'var(--text-ghost)' }}>
                            {fault.type === 'transformer' ? t.map.typeTransformer : fault.type === 'cable' ? t.map.typeCable : t.map.typeSwitchable} · {fault.affectedClients.toLocaleString()} {t.map.tooltipClients.replace(':', '')}
                          </span>
                          {fault.criticalSite && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                              {fault.criticalSite}
                            </span>
                          )}
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                          <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{t.results.mitigationLabel}: </span>{action}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0 mt-auto" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/SAP_2011_logo.svg/1280px-SAP_2011_logo.svg.png" alt="SAP" style={{ height: 13, opacity: 0.25 }} />
            <span className="text-[11px] font-mono" style={{ color: 'var(--text-ghost)' }}>{t.app.title} · Área Metropolitana de Lisboa</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadReport}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-dim)', border: '1px solid var(--border)', cursor: 'pointer' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t.results.download}
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-lg text-xs font-bold"
              style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)', cursor: 'pointer' }}
            >
              {t.results.close}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
