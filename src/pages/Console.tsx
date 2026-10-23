import { useEffect, useMemo, useState } from 'react';
import {
  Activity, BellRing, Check, Cpu, Gauge, ListFilter, ShieldAlert,
  Thermometer, Wind, Zap, Fan, Boxes, CircleDot, Wrench,
} from 'lucide-react';
import { useSim, engine, type DeviceSim, type Severity } from '../lib/engine';
import {
  AnimatedNumber, LatencyChart, RingGauge, Sparkline, fmtCompact, GOLD, VIOL_SOFT, RED,
} from '../lib/viz';
import { ConsoleLiveBadge, useToast } from '../components/Toast';

const sevStyle: Record<Severity, string> = {
  critical: 'border-red-500/40 bg-red-500/10 text-red-300',
  warning: 'border-gold/40 bg-gold/10 text-gold',
  info: 'border-viol/40 bg-viol/10 text-violsoft',
};

const statusStyle: Record<string, { dot: string; text: string; label: string }> = {
  online: { dot: 'bg-emerald-400', text: 'text-emerald-300', label: 'ONLINE' },
  warning: { dot: 'bg-gold', text: 'text-gold', label: 'WARNING' },
  critical: { dot: 'bg-red-400', text: 'text-red-300', label: 'CRITICAL' },
  failed: { dot: 'bg-red-500', text: 'text-red-400', label: 'FAILED' },
};

const kindIcon = (kind: string) => {
  const k = kind.toLowerCase();
  if (k.includes('thermal')) return Thermometer;
  if (k.includes('vibration') || k.includes('spindle')) return Activity;
  if (k.includes('power')) return Zap;
  if (k.includes('pressure')) return Gauge;
  if (k.includes('flow') || k.includes('air')) return Wind;
  if (k.includes('env')) return Boxes;
  if (k.includes('torque')) return Wrench;
  return Cpu;
};

const logColor: Record<string, string> = {
  edge: 'text-gold', cloud: 'text-violsoft', mqtt: 'text-emerald-300',
  alert: 'text-red-300', sync: 'text-cyan-300', sys: 'text-amber-200',
};

export default function Console() {
  const sim = useSim();
  const toast = useToast();
  const [siteFilter, setSiteFilter] = useState<'all' | 'site-a' | 'site-b'>('all');
  const [alertFilter, setAlertFilter] = useState<'all' | Severity>('all');

  const visibleDevices = useMemo(() => sim.devices.filter((d) => siteFilter === 'all' || d.site === siteFilter), [sim.devices, siteFilter]);
  const visibleAlerts = useMemo(() => sim.alerts.filter((a) => alertFilter === 'all' || a.sev === alertFilter), [sim.alerts, alertFilter]);
  const speedup = (sim.cloudMs / sim.edgeMs).toFixed(1);
  const online = sim.devices.filter((d) => d.status !== 'failed').length;
  const queuedTotal = sim.outage.queued;

  return (
    <div className="relative mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10">
      {/* ambient glows */}
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-viol/12 blur-[140px]" />
      <div aria-hidden className="pointer-events-none absolute top-40 right-0 h-96 w-96 rounded-full bg-gold/8 blur-[150px]" />

      {/* ===== Page header ===== */}
      <div className="relative mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Mission Control · eu-central-1</span>
          <h1 className="font-display mt-2 text-4xl font-black tracking-tight text-cream">Live <span className="gold-text">Console</span></h1>
          <p className="mt-1.5 max-w-md text-[12px] leading-relaxed text-[#a99dd0]">Every reading, decision and sync event below is streaming from the simulated twin of the Antwerp pilot — right now.</p>
        </div>
        <div className="flex items-center gap-3">
          <ConsoleLiveBadge />
          <div className="flex rounded-xl border border-line2 p-1">
            {([['all', 'Both sites'], ['site-a', 'Antwerp A'], ['site-b', 'Antwerp B']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setSiteFilter(k)} className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${siteFilter === k ? 'bg-gold text-[#231a05] shadow' : 'text-[#b9b0d6] hover:text-cream'}`}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== KPI ribbon ===== */}
      <div className="relative mb-5 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
        {[
          { icon: Gauge, label: 'Edge decision P50', value: `${sim.edgeMs.toFixed(1)} ms`, sub: `${speedup}× faster than cloud path`, tone: 'text-gold' },
          { icon: Activity, label: 'Cloud round-trip', value: `${sim.cloudMs.toFixed(0)} ms`, sub: 'telemetry ack · eu-central-1', tone: 'text-violsoft' },
          { icon: Zap, label: 'Ingest rate', value: <><AnimatedNumber value={sim.eps} /> <span className="text-base">EPS</span></>, sub: `${fmtCompact(sim.totals.events)} lifetime events`, tone: 'text-cream' },
          { icon: ShieldAlert, label: 'Delta queue', value: <AnimatedNumber value={queuedTotal} format={(v) => Math.round(v).toLocaleString()} />, sub: sim.outage.phase === 'up' ? 'buffer empty — steady state' : sim.outage.phase === 'out' ? 'buffering at the edge…' : 'draining to cloud…', tone: sim.outage.phase === 'up' ? 'text-emerald-300' : 'text-gold' },
        ].map(({ icon: Icon, label, value, sub, tone }, i) => (
          <div key={i} className="panel noise panel-hover flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line2 bg-panel2 text-gold"><Icon size={17} strokeWidth={1.7} /></span>
            <div className="min-w-0">
              <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#8d84ad]">{label}</div>
              <div className={`font-display mt-0.5 text-[19px] font-semibold leading-none ${tone} tabular`}>{value}</div>
              <div className="mt-1 truncate text-[8.5px] text-[#8d84ad]">{sub}</div>
            </div>
          </div>
        ))}
        <div className="panel noise panel-hover col-span-2 flex items-center justify-center gap-5 p-4 md:col-span-4 xl:col-span-1">
          <RingGauge pct={sim.plantHealth} size={86} stroke={9} color={sim.plantHealth > 85 ? GOLD : RED}>
            <span className="font-display text-[17px] font-bold text-cream tabular">{sim.plantHealth.toFixed(0)}%</span>
          </RingGauge>
          <div>
            <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#8d84ad]">Plant health</div>
            <div className="mt-1 text-[10px] leading-snug text-[#a99dd0]">Composite of<br />{online}/{sim.devices.length} devices<br />reporting nominal</div>
          </div>
        </div>
      </div>

      {/* ===== Plant map + alert feed ===== */}
      <div className="relative mb-5 grid gap-5 xl:grid-cols-12">
        {/* Plant map */}
        <div className="panel noise overflow-hidden xl:col-span-8">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <CircleDot size={13} className="text-gold" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cream">Antwerp Pilot — Digital Twin</span>
            </div>
            <div className="flex items-center gap-4 font-mono text-[8.5px] text-[#8d84ad]">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> NOMINAL</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gold" /> DRIFT</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> FAILED</span>
            </div>
          </div>
          <PlantMap devices={sim.devices} />
        </div>

        {/* Alert feed */}
        <div className="panel noise flex max-h-[430px] flex-col overflow-hidden xl:col-span-4" id="alerts">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <BellRing size={13} className="text-gold" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cream">Anomaly Feed</span>
              <span className="rounded-full bg-red-500/15 px-2 py-0.5 font-mono text-[9px] font-bold text-red-300 tabular">{sim.alerts.filter(a => a.sev === 'critical').length} CRIT</span>
            </div>
            <div className="flex gap-1">
              {(['all', 'critical', 'warning', 'info'] as const).map((f) => (
                <button key={f} onClick={() => setAlertFilter(f)} className={`rounded-md px-2 py-1 font-mono text-[8.5px] font-bold uppercase tracking-wider transition-colors ${alertFilter === f ? 'bg-viol/25 text-violsoft' : 'text-[#8d84ad] hover:text-cream'}`}>{f}</button>
              ))}
            </div>
          </div>
          <div className="console-scroll flex-1 overflow-y-auto p-3">
            {visibleAlerts.length === 0 && <div className="flex h-32 flex-col items-center justify-center text-center"><Check size={22} className="text-emerald-400" /><p className="mt-2 text-[11px] text-[#a99dd0]">No {alertFilter === 'all' ? '' : alertFilter} anomalies in the window.<br />The floor is calm — for now.</p></div>}
            {visibleAlerts.map((a) => (
              <div key={a.id} className={`group mb-2 rounded-xl border p-3 transition-colors ${sevStyle[a.sev]}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${a.sev === 'critical' ? 'bg-red-400 pulse-red' : a.sev === 'warning' ? 'bg-gold' : 'bg-violsoft'}`} />
                    <span className="font-mono text-[9px] font-bold tracking-wider">{a.device}</span>
                    <span className="font-mono text-[8px] text-[#8d84ad] tabular">{new Date(a.ts).toLocaleTimeString('en-GB')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[8.5px] text-[#8d84ad]">SCORE <span className="font-bold text-cream">{a.score}</span></span>
                    <button onClick={() => { engine.ackAlert(a.id); toast('Anomaly acknowledged', `${a.device} alert closed · audit trail updated.`); }} className="rounded-md border border-line2 p-1 text-[#a99dd0] opacity-0 transition-all hover:border-gold/50 hover:text-gold group-hover:opacity-100" aria-label="Acknowledge"><Check size={11} /></button>
                  </div>
                </div>
                <div className="mt-1.5 text-[11px] font-bold leading-snug text-cream">{a.title}</div>
                <div className="mt-1 text-[9.5px] leading-snug text-[#b9b0d6]">{a.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== Latency + console log ===== */}
      <div className="relative mb-6 grid gap-5 xl:grid-cols-12">
        <div className="panel noise p-5 xl:col-span-7">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#8d84ad]">Edge vs Cloud — live latency</div>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="font-display text-2xl font-bold text-gold tabular">{sim.edgeMs.toFixed(1)} <span className="text-sm">ms</span></span>
                <span className="font-mono text-[10px] text-[#8d84ad]">vs</span>
                <span className="font-display text-2xl font-bold text-violsoft tabular">{sim.cloudMs.toFixed(0)} <span className="text-sm">ms</span></span>
                <span className="rounded-md border border-gold/30 bg-gold/10 px-2 py-0.5 font-mono text-[10px] font-bold text-gold">{speedup}× EDGE WIN</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 font-mono text-[8px] text-[#8d84ad]">
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full bg-gold" /> EDGE (hot path)</span>
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full bg-violsoft" /> CLOUD (cold path)</span>
            </div>
          </div>
          <div className="mt-3"><LatencyChart data={sim.latencyHist} height={158} /></div>
        </div>

        {/* Terminal */}
        <div className="panel noise overflow-hidden xl:col-span-5">
          <div className="flex items-center justify-between border-b border-line bg-[#0b0817] px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-red-400/80" /><i className="h-2.5 w-2.5 rounded-full bg-gold/80" /><i className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" /></span>
              <span className="ml-2 font-mono text-[9px] tracking-widest text-[#8d84ad]">edgesync — stream ./telemetry.tail</span>
            </div>
            <ListFilter size={12} className="text-[#6f658f]" />
          </div>
          <div className="console-scroll h-[218px] overflow-hidden bg-[#0b0817] p-3 font-mono text-[9.5px] leading-[1.72]">
            {sim.log.slice(0, 11).map((l) => (
              <div key={l.id} className="flex gap-2 whitespace-nowrap">
                <span className="text-[#54497a] tabular">{new Date(l.ts).toLocaleTimeString('en-GB')}</span>
                <span className={logColor[l.level] ?? 'text-[#b9b0d6]'}>{l.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== Device grid ===== */}
      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Fan size={14} className="text-gold" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cream">Connected Devices · {visibleDevices.length}/{sim.devices.length}</span>
          </div>
          <span className="font-mono text-[9px] text-[#8d84ad]">click <Zap size={9} className="inline text-gold" /> to inject a fault — watch the edge react</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleDevices.map((d) => (
            <DeviceCard key={d.id} d={d} toast={toast} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DeviceCard({ d, toast }: { d: DeviceSim; toast: (t: string, d2?: string) => void }) {
  const Icon = kindIcon(d.kind);
  const st = statusStyle[d.status];
  const failed = d.status === 'failed';
  const color = failed ? RED : d.status === 'critical' ? RED : d.status === 'warning' ? GOLD : d.site === 'site-a' ? GOLD : VIOL_SOFT;
  const anomPct = Math.round(d.anomaly);
  return (
    <div className={`panel group relative overflow-hidden p-4 transition-colors ${failed ? 'border-red-500/40' : 'hover:border-gold/25'}`}>
      {failed && <div aria-hidden className="absolute inset-0 animate-pulse rounded-[1.25rem] border border-red-500/30" />}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className={`flex h-9 w-9 items-center justify-center rounded-lg border ${failed ? 'border-red-500/40 bg-red-500/10 text-red-400' : 'border-line2 bg-panel2 text-violsoft'}`}><Icon size={16} strokeWidth={1.6} /></span>
          <div>
            <div className="font-mono text-[10.5px] font-bold text-cream">{d.id}</div>
            <div className="text-[9px] text-[#8d84ad]">{d.kind} · {d.site === 'site-a' ? 'Site A' : 'Site B'}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`flex items-center gap-1.5 font-mono text-[8px] font-bold tracking-[0.18em] ${st.text}`}><span className={`h-1.5 w-1.5 rounded-full ${st.dot} ${failed ? 'pulse-red' : ''}`} />{st.label}</span>
          <button
            onClick={() => {
              if (failed) { engine.clearFault(d.id); toast('Fault cleared', `${d.id} is reporting nominal telemetry again.`); }
              else { engine.injectFault(d.id); toast('Fault injected', `${d.id} will drop heartbeats in ~1.5s. Edge watchdog engaged.`); }
            }}
            title={failed ? 'Clear injected fault' : 'Inject device failure'}
            className={`rounded-md border p-1.5 transition-all ${failed ? 'border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10' : 'border-line2 text-[#8d84ad] hover:border-gold/50 hover:text-gold'}`}
          >
            {failed ? <Check size={12} /> : <Zap size={12} />}
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[7.5px] uppercase tracking-[0.22em] text-[#8d84ad]">{d.metric}</div>
          <div className="font-display mt-0.5 text-[23px] font-semibold leading-none text-cream tabular">
            {failed ? '——.—' : d.value.toFixed(d.unit === 'kW' || d.unit === 'A' || d.unit === 'L/min' ? 0 : 1)}
            <span className="ml-1.5 text-[11px] font-normal text-[#8d84ad]">{d.unit}</span>
          </div>
        </div>
        <Sparkline data={d.hist.slice(-40)} color={color} width={118} height={40} />
      </div>

      {/* anomaly meter */}
      <div className="mt-3">
        <div className="flex items-center justify-between font-mono text-[7px] uppercase tracking-[0.18em] text-[#8d84ad]">
          <span>Anomaly score</span>
          <span className={anomPct > 60 ? 'text-red-300' : anomPct > 40 ? 'text-gold' : 'text-emerald-300'}>{anomPct}/99</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#221c38]">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${anomPct}%`, background: anomPct > 60 ? 'linear-gradient(90deg,#f4c64a,#f87171)' : anomPct > 40 ? 'linear-gradient(90deg,#34d399,#f4c64a)' : 'linear-gradient(90deg,#34d399,#10b981)' }} />
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2 font-mono text-[7.5px] text-[#6f658f]">
        <span>HEALTH <span className={d.health < 75 ? 'text-red-300' : 'text-[#a99dd0]'}>{d.health.toFixed(0)}%</span></span>
        <span>EDGE INFER <span className="text-gold">{d.lastDecisionMs.toFixed(1)} ms</span></span>
        {d.queued > 0 && <span className="text-gold">QUEUED {d.queued}</span>}
        <span>RUL <span className="text-[#a99dd0]">{Math.max(3, Math.round(d.health / 7.4))}d</span></span>
      </div>
    </div>
  );
}

/* ---------- Animated digital map of the two sites (SVG) ---------- */
function PlantMap({ devices }: { devices: DeviceSim[] }) {
  const siteA = devices.filter((d) => d.site === 'site-a');
  const siteB = devices.filter((d) => d.site === 'site-b');
  const dot = (d: DeviceSim, x: number, y: number) => {
    const c = d.status === 'failed' ? '#ef4444' : d.status === 'critical' ? '#f87171' : d.status === 'warning' ? '#f4c64a' : '#34d399';
    return (
      <g key={d.id}>
        <circle cx={x} cy={y} r={d.status === 'failed' ? 7 : 5} fill={c} opacity={0.16}>
          <animate attributeName="r" values={`${d.status === 'failed' ? 6 : 4};${d.status === 'failed' ? 13 : 9};${d.status === 'failed' ? 6 : 4}`} dur={d.status === 'failed' ? '1.1s' : '2.6s'} repeatCount="indefinite" />
        </circle>
        <circle cx={x} cy={y} r={2.7} fill={c} stroke="#0d0a17" strokeWidth={1} />
      </g>
    );
  };
  const aPos = [[44, 62], [84, 46], [128, 62], [170, 44], [210, 66], [250, 48], [60, 96], [110, 90], [160, 96], [215, 92]];
  const bPos = [[412, 60], [455, 46], [498, 62], [540, 48], [578, 66], [618, 50], [430, 96], [486, 92], [544, 96], [600, 90]];
  return (
    <svg viewBox="0 0 660 170" className="w-full">
      <defs>
        <linearGradient id="pm-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#171230" /><stop offset="1" stopColor="#100c20" />
        </linearGradient>
        <radialGradient id="pm-edge-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#f4c64a" stopOpacity="0.32" /><stop offset="1" stopColor="#f4c64a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pm-edge-glow-b" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#8b5cf6" stopOpacity="0.34" /><stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Site plates */}
      <rect x="14" y="18" width="300" height="130" rx="12" fill="url(#pm-floor)" stroke="#f4c64a" strokeOpacity="0.35" strokeWidth="1.2" />
      <rect x="360" y="18" width="286" height="130" rx="12" fill="url(#pm-floor)" stroke="#8b5cf6" strokeOpacity="0.4" strokeWidth="1.2" />

      {/* labels */}
      <text x="28" y="38" fill="#f4c64a" fontSize="9" fontWeight="700" fontFamily="JetBrains Mono" letterSpacing="2">SITE A — ERPE-MERE</text>
      <text x="28" y="51" fill="#8d84ad" fontSize="7" fontFamily="JetBrains Mono">EDGE GATEWAY ERV-G2 · 10 NODES</text>
      <text x="374" y="38" fill="#a78bfa" fontSize="9" fontWeight="700" fontFamily="JetBrains Mono" letterSpacing="2">SITE B — ANTWERP NORTH</text>
      <text x="374" y="51" fill="#8d84ad" fontSize="7" fontFamily="JetBrains Mono">EDGE GATEWAY ANT-G1 · 8 NODES</text>

      {/* building silhouettes */}
      {[[30, 74, 26, 34], [64, 66, 30, 42], [104, 78, 24, 30], [140, 62, 34, 46], [184, 74, 26, 34], [222, 64, 30, 44], [268, 76, 18, 32]].map(([x, y, w, h], i) => (
        <rect key={`a${i}`} x={x} y={y} width={w} height={h} rx="2" fill="#1e1836" stroke="#332a54" strokeWidth="0.8" />
      ))}
      {[[400, 72, 28, 36], [438, 62, 30, 46], [476, 74, 26, 34], [514, 62, 32, 46], [554, 74, 26, 34], [590, 66, 30, 42]].map(([x, y, w, h], i) => (
        <rect key={`b${i}`} x={x} y={y} width={w} height={h} rx="2" fill="#1e1836" stroke="#3a2f5e" strokeWidth="0.8" />
      ))}

      {/* device dots */}
      {siteA.map((d, i) => dot(d, aPos[i][0], aPos[i][1]))}
      {siteB.map((d, i) => dot(d, bPos[i][0], bPos[i][1]))}

      {/* edge nodes with glow */}
      <circle cx="140" cy="132" r="26" fill="url(#pm-edge-glow)" />
      <rect x="128" y="124" width="24" height="14" rx="3" fill="#241b0a" stroke="#f4c64a" strokeWidth="1.2" />
      <text x="140" y="134" textAnchor="middle" fill="#f4c64a" fontSize="6.5" fontWeight="800" fontFamily="JetBrains Mono">EDGE</text>

      <circle cx="505" cy="132" r="26" fill="url(#pm-edge-glow-b)" />
      <rect x="493" y="124" width="24" height="14" rx="3" fill="#1c1030" stroke="#a78bfa" strokeWidth="1.2" />
      <text x="505" y="134" textAnchor="middle" fill="#a78bfa" fontSize="6.5" fontWeight="800" fontFamily="JetBrains Mono">EDGE</text>

      {/* uplink */}
      <line x1="152" y1="131" x2="338" y2="131" stroke="#f4c64a" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="3 5" />
      <circle r="2.3" fill="#f4c64a"><animateMotion dur="2.4s" repeatCount="indefinite" path="M152,131 L505,131" /></circle>
    </svg>
  );
}
