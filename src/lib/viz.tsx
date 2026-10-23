import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

export const GOLD = '#f4c64a';
export const GOLD_SOFT = '#e8b53a';
export const VIOL = '#8b5cf6';
export const VIOL_SOFT = '#a78bfa';
export const VIOL_DEEP = '#6d28d9';
export const CREAM = '#f7f3e8';
export const GREEN = '#34d399';
export const RED = '#f87171';

/* ---------- Animated count-up ---------- */
export function useAnimatedNumber(target: number, duration = 900) {
  const [val, setVal] = useState(target);
  useEffect(() => {
    const from = val;
    if (from === target) return;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(2, -9 * p); // easeOutExpo-ish
      setVal(from + (target - from) * (p === 1 ? 1 : e));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return val;
}

export function AnimatedNumber({ value, format }: { value: number; format?: (v: number) => string }) {
  const v = useAnimatedNumber(value);
  const text = format ? format(v) : Math.round(v).toLocaleString();
  return <span className="tabular">{text}</span>;
}

export const fmtCompact = (n: number) =>
  Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 }).format(n);
export const fmtInt = (n: number) => Math.round(n).toLocaleString();
export const fmt1 = (n: number) => n.toFixed(1);
export const fmtMoney = (n: number) => `$${(n / 1000).toFixed(1)}M`;

/* ---------- KPI stat block ---------- */
export function Stat({ label, value, sub, tone = 'gold' }: { label: string; value: ReactNode; sub?: string; tone?: 'gold' | 'viol' | 'green' | 'red' | 'cream' }) {
  const color = tone === 'gold' ? 'text-gold' : tone === 'viol' ? 'text-violsoft' : tone === 'green' ? 'text-emerald-400' : tone === 'red' ? 'text-red-400' : 'text-cream';
  return (
    <div>
      <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#8d84ad]">{label}</div>
      <div className={`mt-1.5 font-display text-[26px] leading-none font-semibold ${color} tabular`}>{value}</div>
      {sub && <div className="mt-1.5 text-[10.5px] text-[#8d84ad]">{sub}</div>}
    </div>
  );
}

/* ---------- Ring gauge ---------- */
export function RingGauge({ pct, size = 128, stroke = 10, color = GOLD, track = 'rgba(238,231,255,0.07)', children, label }: {
  pct: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode; label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const target = clamp01(pct / 100);
  const [anim, setAnim] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const from = anim;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / 900);
      const e = 1 - Math.pow(2, -8 * p);
      setAnim(from + (target - from) * (p === 1 ? 1 : e));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  const id = useMemo(() => Math.random().toString(36).slice(2), []);
  return (
    <div className="relative inline-flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id={`g-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.55" />
          </linearGradient>
          <filter id={`f-${id}`} x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor={color} floodOpacity="0.55" />
          </filter>
        </defs>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke={`url(#g-${id})`} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - anim)}
          filter={`url(#f-${id})`} style={{ transition: 'stroke-dashoffset 120ms linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
      {label && <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.22em] text-[#8d84ad]">{label}</div>}
    </div>
  );
}
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/* ---------- Sparkline ---------- */
export function Sparkline({ data, color = GOLD, width = 150, height = 44, filled = true }: {
  data: number[]; color?: string; width?: number; height?: number; filled?: boolean;
}) {
  const id = useMemo(() => Math.random().toString(36).slice(2), []);
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * width, height - 4 - ((v - min) / range) * (height - 10)] as const);
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={`s-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.42" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {filled && <path d={area} fill={`url(#s-${id})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.4" fill={color} />
    </svg>
  );
}

/* ---------- Section heading ---------- */
export function SectionHead({ eyebrow, title, right }: { eyebrow: string; title: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2 className="font-display mt-2 text-[19px] font-semibold text-cream leading-tight">{title}</h2>
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

/* ---------- Styled chart tooltip ---------- */
export function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line2 bg-[#171227]/95 px-3 py-2 shadow-2xl backdrop-blur-md">
      <div className="font-mono text-[9px] uppercase tracking-widest text-[#8d84ad] mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-[11px]">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.stroke || p.fill || p.color }} />
          <span className="text-[#b9b0d6]">{p.name}</span>
          <span className="ml-auto font-mono font-semibold text-cream pl-3">{typeof p.value === 'number' ? p.value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

export const chartAxis = { stroke: '#241d3d', tick: { fill: '#8d84ad', fontSize: 9, fontFamily: 'JetBrains Mono' }, tickLine: false, axisLine: false } as const;

/* ---------- Latency comparison chart ---------- */
export function LatencyChart({ data, height = 150, showArea = true }: { data: { t: number; edge: number; cloud: number }[]; height?: number; showArea?: boolean }) {
  const fmt = (t: number) => new Date(t).toLocaleTimeString('en-GB', { minute: '2-digit', second: '2-digit' });
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 0, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="lg-edge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GOLD} stopOpacity={0.5} /><stop offset="100%" stopColor={GOLD} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="lg-cloud" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={VIOL} stopOpacity={0.45} /><stop offset="100%" stopColor={VIOL} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 6" stroke="rgba(238,231,255,0.05)" vertical={false} />
        <XAxis dataKey="t" tickFormatter={fmt} {...chartAxis} interval="preserveStartEnd" minTickGap={50} />
        <YAxis {...chartAxis} width={40} />
        <Tooltip content={<ChartTooltip />} />
        {showArea ? (
          <>
            <Area type="monotone" dataKey="cloud" name="Cloud round-trip" stroke={VIOL_SOFT} strokeWidth={1.6} fill="url(#lg-cloud)" dot={false} isAnimationActive={false} />
            <Area type="monotone" dataKey="edge" name="Edge decision" stroke={GOLD} strokeWidth={2} fill="url(#lg-edge)" dot={false} isAnimationActive={false} />
          </>
        ) : (
          <>
            <Line type="monotone" dataKey="cloud" name="Cloud round-trip" stroke={VIOL_SOFT} strokeWidth={1.6} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="edge" name="Edge decision" stroke={GOLD} strokeWidth={2} dot={false} isAnimationActive={false} />
          </>
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ---------- Throughput chart ---------- */
export function ThroughputChart({ data, height = 150 }: { data: { t: number; ingested: number; synced: number }[]; height?: number }) {
  const fmt = (t: number) => new Date(t).toLocaleTimeString('en-GB', { minute: '2-digit', second: '2-digit' });
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 6, right: 0, left: -4, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid strokeDasharray="2 6" stroke="rgba(238,231,255,0.05)" vertical={false} />
        <XAxis dataKey="t" tickFormatter={fmt} {...chartAxis} interval="preserveStartEnd" minTickGap={50} />
        <YAxis {...chartAxis} width={40} />
        <Tooltip cursor={{ fill: 'rgba(139,92,246,0.09)' }} content={<ChartTooltip />} />
        <Bar dataKey="ingested" name="Ingested EPS" radius={[3, 3, 0, 0]} isAnimationActive={false}>
          {data.map((_, i) => <Cell key={i} fill={GOLD} fillOpacity={0.55 + (i / data.length) * 0.45} />)}
        </Bar>
        <Bar dataKey="synced" name="Synced EPS" radius={[3, 3, 0, 0]} isAnimationActive={false}>
          {data.map((_, i) => <Cell key={i} fill={VIOL} fillOpacity={0.55 + (i / data.length) * 0.45} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------- Latency histogram (edge decision distribution) ---------- */
export function DecisionHistogram({ data, height = 120 }: { data: number[]; height?: number }) {
  const bins = useMemo(() => {
    const edges = [2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7];
    const counts = new Array(edges.length - 1).fill(0);
    data.forEach((v) => {
      for (let i = 0; i < edges.length - 1; i++) {
        if (v >= edges[i] && v < edges[i + 1]) { counts[i]++; return; }
      }
    });
    return counts.map((c, i) => ({ bin: `${edges[i]}–${edges[i + 1]}`, count: c }));
  }, [data]);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={bins} margin={{ top: 4, right: 0, left: -14, bottom: 0 }}>
        <XAxis dataKey="bin" {...chartAxis} interval={1} />
        <YAxis {...chartAxis} width={34} />
        <Tooltip cursor={{ fill: 'rgba(244,198,74,0.08)' }} content={<ChartTooltip />} />
        <Bar dataKey="count" name="Decisions" radius={[3, 3, 0, 0]} isAnimationActive={false}>
          {bins.map((_, i) => <Cell key={i} fill={i < 5 ? GOLD : VIOL_SOFT} fillOpacity={0.5 + (i / bins.length) * 0.5} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------- Pipeline / flow diagram (animated SVG) ---------- */
export function FlowDiagram({ mode }: { mode: 'marketing' | 'outage' | 'restored'; height?: number }) {
  const siteADown = mode === 'outage';
  const glow = (active: boolean) => (active ? 1 : 0.28);
  const node = (x: number, y: number, w: number, h: number, stroke: string) => (
    <rect x={x} y={y} width={w} height={h} rx={10} fill="#141024" stroke={stroke} strokeWidth={1.4} strokeOpacity={0.9} />
  );
  return (
    <svg viewBox="0 0 760 210" className="w-full" role="img" aria-label="Edge-to-cloud data flow diagram">
      <defs>
        <linearGradient id="fd-gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={GOLD} stopOpacity="0.15" /><stop offset="0.5" stopColor={GOLD} /><stop offset="1" stopColor={GOLD} stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id="fd-viol" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={VIOL} stopOpacity="0.15" /><stop offset="0.5" stopColor={VIOL_SOFT} /><stop offset="1" stopColor={VIOL} stopOpacity="0.15" />
        </linearGradient>
        <filter id="fd-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={GOLD} floodOpacity="0.7" />
        </filter>
      </defs>

      {/* connectors */}
      <line x1="150" y1="105" x2="262" y2="105" stroke="url(#fd-gold)" strokeWidth="2" className="flow-line" strokeOpacity={0.9} />
      <line x1="398" y1="105" x2="512" y2="105" stroke={siteADown ? RED : 'url(#fd-viol)'} strokeWidth="2" strokeDasharray={siteADown ? '4 6' : undefined} className={siteADown ? undefined : 'flow-line'} strokeOpacity={siteADown ? 0.8 : 0.9} />
      <line x1="646" y1="105" x2="735" y2="105" stroke="url(#fd-viol)" strokeWidth="2" className="flow-line" strokeOpacity={mode === 'marketing' ? 0.9 : 0.35} />

      {/* packets */}
      {!siteADown && <circle r="3.4" fill={GOLD} filter="url(#fd-glow)"><animateMotion dur="1.6s" repeatCount="indefinite" path="M150,105 L262,105" /></circle>}
      {!siteADown && <circle r="2.6" fill={GOLD} opacity="0.75"><animateMotion dur="1.6s" begin="0.8s" repeatCount="indefinite" path="M150,105 L262,105" /></circle>}
      {!siteADown && <circle r="3" fill={VIOL_SOFT}><animateMotion dur="2.1s" repeatCount="indefinite" path="M398,105 L512,105" /></circle>}
      {siteADown && <>
        <circle r="3" fill={GOLD}><animateMotion dur="1.15s" repeatCount="indefinite" path="M300,105 L300,164" opacity="0.8"/></circle>
        <text x="330" y="180" fill={GOLD} fontSize="9" fontFamily="JetBrains Mono" letterSpacing="1.5">DELTA QUEUE</text>
      </>}
      {mode === 'marketing' && <circle r="3" fill={VIOL_SOFT} opacity="0.9"><animateMotion dur="1.9s" begin="0.4s" repeatCount="indefinite" path="M646,105 L735,105" /></circle>}

      {/* Node 1: devices */}
      <g opacity={1}>
        {node(18, 62, 132, 86, GOLD)}
        <text x="84" y="88" textAnchor="middle" fill={CREAM} fontSize="10.5" fontWeight="700" fontFamily="Manrope">IIoT DEVICES</text>
        <text x="84" y="103" textAnchor="middle" fill="#a99dd0" fontSize="8" fontFamily="JetBrains Mono">18 fleet · MQTT</text>
        <text x="84" y="115" textAnchor="middle" fill="#8d84ad" fontSize="8" fontFamily="JetBrains Mono">3,560 msg/s</text>
        <circle cx="84" cy="131" r="2.6" fill={GREEN} className="pulse-dot" />
        <text x="94" y="134" fill="#34d399" fontSize="7.5" fontFamily="JetBrains Mono">STREAMING</text>
      </g>

      {/* Node 2: edge */}
      <g>
        <rect x="262" y="52" width="136" height="106" rx="12" fill="#191233" stroke={GOLD} strokeWidth="1.6" strokeOpacity="0.95" />
        <rect x="270" y="60" width="120" height="90" rx="9" fill="none" stroke={GOLD} strokeWidth="0.5" strokeOpacity="0.4" />
        <text x="330" y="86" textAnchor="middle" fill={GOLD} fontSize="10.5" fontWeight="800" fontFamily="Manrope" letterSpacing="0.5">EDGE NODE</text>
        <text x="330" y="101" textAnchor="middle" fill="#cbbcf0" fontSize="8" fontFamily="JetBrains Mono">ONNX · 4 ms infer</text>
        <text x="330" y="113" textAnchor="middle" fill="#cbbcf0" fontSize="8" fontFamily="JetBrains Mono">98.7% local decisions</text>
        <text x="330" y="133" textAnchor="middle" fill={siteADown ? GOLD : '#34d399'} fontSize="7.5" fontWeight="700" fontFamily="JetBrains Mono" letterSpacing="1.5">{siteADown ? 'AUTONOMY MODE' : 'ACTING LOCALLY'}</text>
      </g>

      {/* Node 3: uplink */}
      <g opacity={siteADown ? 0.9 : 1}>
        {node(512, 62, 134, 86, siteADown ? RED : VIOL_SOFT)}
        <text x="579" y="88" textAnchor="middle" fill={siteADown ? '#fca5a5' : CREAM} fontSize="10.5" fontWeight="700" fontFamily="Manrope">{siteADown ? 'UPLINK DOWN' : 'WAN UPLINK'}</text>
        <text x="579" y="103" textAnchor="middle" fill="#a99dd0" fontSize="8" fontFamily="JetBrains Mono">{siteADown ? 'carrier drop · BGP' : 'MQTT/TLS · QoS 1'}</text>
        <text x="579" y="115" textAnchor="middle" fill="#a99dd0" fontSize="8" fontFamily="JetBrains Mono">{siteADown ? 'site-a isolated' : 'eu-central-1 · 96 ms'}</text>
        {siteADown ? <text x="579" y="133" textAnchor="middle" fill={RED} fontSize="7.5" fontWeight="700" fontFamily="JetBrains Mono" letterSpacing="1.5" className="blink">LINK SEVERED</text>
          : <circle cx="579" cy="131" r="2.6" fill={GREEN} className="pulse-dot" />}
      </g>

      {/* Node 4: cloud */}
      <g opacity={mode === 'restored' ? 1 : 1}>
        {node(646, 62, 96, 86, VIOL)}
        <text x="694" y="88" textAnchor="middle" fill={CREAM} fontSize="10.5" fontWeight="700" fontFamily="Manrope">CLOUD</text>
        <text x="694" y="102" textAnchor="middle" fill="#a99dd0" fontSize="7.5" fontFamily="JetBrains Mono">PostgreSQL 16</text>
        <text x="694" y="113" textAnchor="middle" fill="#a99dd0" fontSize="7.5" fontFamily="JetBrains Mono">+ TimescaleDB</text>
        <text x="694" y="128" textAnchor="middle" fill="#8b5cf6" fontSize="7.5" fontFamily="JetBrains Mono">global BI</text>
      </g>

      {/* legend */}
      <text x="18" y="202" fill="#6f658f" fontSize="7.5" fontFamily="JetBrains Mono" letterSpacing="1">HOT PATH · 4 ms EDGE → SAFE STATE</text>
      <text x="742" y="202" textAnchor="end" fill="#6f658f" fontSize="7.5" fontFamily="JetBrains Mono" letterSpacing="1">COLD PATH · CLOUD ANALYTICS & BI</text>
    </svg>
  );
}

export { LineChart };
