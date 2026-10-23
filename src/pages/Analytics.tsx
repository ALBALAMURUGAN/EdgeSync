import { useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  CalendarDays, TrendingDown, ShieldCheck, Timer, Zap, Target, Percent, BadgeCheck, Flame,
} from 'lucide-react';
import { useSim } from '../lib/engine';
import {
  ChartTooltip, DecisionHistogram, LatencyChart, RingGauge, chartAxis,
  GOLD, GOLD_SOFT, VIOL, VIOL_SOFT, GREEN, RED,
} from '../lib/viz';

/* deterministic PRNG for reproducible "history" */
function mulberry(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Range = '24h' | '7d';

export default function Analytics() {
  const sim = useSim();
  const [range, setRange] = useState<Range>('24h');

  /* Seeded historical series: fleet-avg temperature & vibration */
  const history = useMemo(() => {
    const rnd = mulberry(20261023);
    const n = range === '24h' ? 48 : 56;
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = range === '24h'
        ? new Date(Date.now() - (n - i) * 30 * 60_000)
        : new Date(Date.now() - (n - i) * 3 * 3600_000);
      const diurnal = Math.sin((i / n) * Math.PI * (range === '24h' ? 4 : 7) - 1.2);
      out.push({
        t: range === '24h' ? t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : t.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', hour: range === '7d' ? '2-digit' : undefined } as Intl.DateTimeFormatOptions),
        temp: +(66 + diurnal * 7 + Math.sin(i * 1.7) * 2 + rnd() * 2.4).toFixed(1),
        vib: +(2.35 + Math.abs(diurnal) * 0.5 + Math.sin(i * 2.3 + 1) * 0.28 + rnd() * 0.22).toFixed(2),
        power: +(398 + Math.sin(i * 0.9 + 0.4) * 46 + rnd() * 22).toFixed(0),
      });
    }
    return out;
  }, [range]);

  /* Edge vs cloud decision latency percentiles (ms) — 30-day measured */
  const percentiles = useMemo(() => [
    { k: 'P50', edge: 3.9, cloud: 94 },
    { k: 'P90', edge: 5.2, cloud: 118 },
    { k: 'P95', edge: 6.1, cloud: 131 },
    { k: 'P99', edge: 8.4, cloud: 167 },
    { k: 'Max', edge: 11.2, cloud: 240 },
  ], []);

  /* Decision-time distribution samples for histogram */
  const decisionSamples = useMemo(() => {
    const rnd = mulberry(987654);
    const out: number[] = [];
    for (let i = 0; i < 900; i++) {
      // log-normal-ish centered at ~4ms
      const v = 2.4 + Math.abs(rnd() + rnd() + rnd() - 1.2) * 2.1 + (rnd() > 0.965 ? rnd() * 1.6 : 0);
      out.push(+v.toFixed(2));
    }
    return out;
  }, []);

  /* Anomaly funnel 30d */
  const funnel = [
    { stage: 'Sensor readings flagged', v: 100, pct: '100%' },
    { stage: 'Model score ≥ 60', v: 34, pct: '34%' },
    { stage: 'Edge-confirmed anomaly', v: 9.2, pct: '9.2%' },
    { stage: 'Ticket auto-opened', v: 6.1, pct: '6.1%' },
    { stage: 'Actioned by operator', v: 5.4, pct: '5.4%' },
  ];

  const severitySplit = [
    { name: 'Info', v: 1181, fill: VIOL_SOFT },
    { name: 'Warning', v: 642, fill: GOLD },
    { name: 'Critical', v: 121, fill: RED },
  ];
  const sevTotal = severitySplit.reduce((a, b) => a + b.v, 0);

  return (
    <div className="relative mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10">
      <div aria-hidden className="pointer-events-none absolute -top-32 left-1/3 h-96 w-[42rem] rounded-full bg-viol/10 blur-[160px]" />

      <div className="relative mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Analytics · trailing 30 days</span>
          <h1 className="font-display mt-2 text-4xl font-black tracking-tight text-cream">Historical <span className="violet-text">Intelligence</span></h1>
          <p className="mt-1.5 max-w-md text-[12px] leading-relaxed text-[#a99dd0]">Trends, latency benchmarks and model performance across the full fleet — distilled from 341M events.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-[#8d84ad] sm:flex"><CalendarDays size={12} /> Oct 1 – Oct 23, 2026</span>
          <div className="flex rounded-xl border border-line2 p-1">
            {(['24h', '7d'] as Range[]).map((r) => (
              <button key={r} onClick={() => setRange(r)} className={`rounded-lg px-4 py-1.5 font-mono text-[11px] font-bold transition-all ${range === r ? 'bg-gold text-[#231a05]' : 'text-[#b9b0d6] hover:text-cream'}`}>{r === '24h' ? '24 H' : '7 D'}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== Headline stats ===== */}
      <div className="relative mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { icon: Target, label: 'Anomaly precision', value: '98.2%', sub: 'F1 0.982 · vib-anomaly-v3.2', tone: 'text-gold' },
          { icon: ShieldCheck, label: 'Sync success (30d)', value: '99.994%', sub: '341M events · 0 lost', tone: 'text-emerald-300' },
          { icon: Timer, label: 'Downtime avoided', value: '68.4 h', sub: '$212k loss averted · 31 incidents', tone: 'text-violsoft' },
          { icon: TrendingDown, label: 'False-positive rate', value: '1.8%', sub: 'down from 6.4% in June', tone: 'text-cream' },
        ].map(({ icon: I, label, value, sub, tone }) => (
          <div key={label} className="panel noise panel-hover flex items-center gap-3.5 p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line2 bg-panel2 text-gold"><I size={18} strokeWidth={1.6} /></span>
            <div className="min-w-0">
              <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#8d84ad]">{label}</div>
              <div className={`font-display mt-0.5 text-[24px] font-semibold leading-none ${tone} tabular`}>{value}</div>
              <div className="mt-1 truncate text-[8.5px] text-[#8d84ad]">{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ===== Main trend + percentiles ===== */}
      <div className="relative mb-5 grid gap-5 xl:grid-cols-12">
        <div className="panel noise p-5 xl:col-span-7">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#8d84ad]">Fleet averages · {range === '24h' ? 'last 24 hours' : 'last 7 days'}</div>
              <div className="mt-0.5 text-[10px] text-[#6f658f]">Composite temperature (°C) and vibration (mm/s)</div>
            </div>
            <div className="flex gap-3 font-mono text-[8.5px] text-[#8d84ad]">
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full bg-gold" /> TEMP</span>
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full bg-violsoft" /> VIBRATION</span>
            </div>
          </div>
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={218}>
              <AreaChart data={history} margin={{ top: 6, right: 0, left: -6, bottom: 0 }}>
                <defs>
                  <linearGradient id="a-temp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GOLD} stopOpacity={0.45} /><stop offset="100%" stopColor={GOLD} stopOpacity={0.02} /></linearGradient>
                  <linearGradient id="a-vib" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={VIOL} stopOpacity={0.5} /><stop offset="100%" stopColor={VIOL} stopOpacity={0.02} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 6" stroke="rgba(238,231,255,0.05)" vertical={false} />
                <XAxis dataKey="t" {...chartAxis} interval="preserveStartEnd" minTickGap={48} />
                <YAxis {...chartAxis} width={38} yAxisId="temp" domain={['dataMin - 2', 'dataMax + 2']} />
                <YAxis {...chartAxis} width={34} yAxisId="vib" orientation="right" domain={['dataMin - 0.3', 'dataMax + 0.3']} hide />
                <Tooltip content={<ChartTooltip />} />
                <Area yAxisId="temp" type="monotone" dataKey="temp" name="Temperature °C" stroke={GOLD} strokeWidth={2} fill="url(#a-temp)" dot={false} />
                <Area yAxisId="vib" type="monotone" dataKey="vib" name="Vibration mm/s" stroke={VIOL_SOFT} strokeWidth={2} fill="url(#a-vib)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {/* power strip */}
          <div className="mt-3 border-t border-line pt-3">
            <div className="flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.2em] text-[#8d84ad]"><span>Aggregate draw</span><span className="text-cream">412 kW avg</span></div>
            <ResponsiveContainer width="100%" height={52}>
              <LineChart data={history} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <Line type="monotone" dataKey="power" name="Power kW" stroke={GOLD_SOFT} strokeWidth={1.6} dot={false} strokeDasharray="1 0" />
                <YAxis hide domain={['dataMin - 20', 'dataMax + 20']} />
                <Tooltip content={<ChartTooltip />} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Percentile bars */}
        <div className="panel noise p-5 xl:col-span-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#8d84ad]">Decision latency percentiles</div>
              <div className="mt-0.5 text-[10px] text-[#6f658f]">Edge pipeline vs. equivalent cloud round-trip · 30-day measured</div>
            </div>
            <Zap size={15} className="text-gold" />
          </div>
          <div className="mt-4 space-y-3.5">
            {percentiles.map((p) => (
              <div key={p.k}>
                <div className="mb-1 flex items-center justify-between font-mono text-[8.5px]">
                  <span className="font-bold text-[#b9b0d6]">{p.k}</span>
                  <span className="text-[#6f658f]">edge <span className="text-gold">{p.edge} ms</span> · cloud <span className="text-violsoft">{p.cloud} ms</span> <span className="text-cream">({Math.round(p.cloud / p.edge)}×)</span></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-[7px] overflow-hidden rounded-full" style={{ width: '12%', background: '#f4c64a' }} />
                  <div className="h-[7px] overflow-hidden rounded-full" style={{ width: '88%', background: 'linear-gradient(90deg,#6d28d9,#a78bfa)' }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-gold/20 bg-gold/5 px-4 py-3">
            <div>
              <div className="font-mono text-[8px] uppercase tracking-[0.22em] text-gold">Headline</div>
              <div className="font-display mt-0.5 text-lg font-bold text-cream">24× faster at P50</div>
            </div>
            <div className="text-right font-mono text-[8.5px] leading-relaxed text-[#8d84ad]">881M safe-state decisions<br />executed before cloud ack</div>
          </div>
        </div>
      </div>

      {/* ===== Histogram · severity donut · gauges ===== */}
      <div className="relative grid gap-5 xl:grid-cols-12">
        <div className="panel noise p-5 xl:col-span-4">
          <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#8d84ad]">Edge decision-time distribution</div>
          <div className="mt-0.5 text-[10px] text-[#6f658f]">900 sampled inferences · vib-anomaly-v3.2 · FP16</div>
          <div className="mt-3"><DecisionHistogram data={decisionSamples} height={132} /></div>
          <div className="mt-1 flex justify-between font-mono text-[8px] text-[#6f658f]"><span>2 ms</span><span>7+ ms</span></div>
        </div>

        {/* Severity donut */}
        <div className="panel noise p-5 xl:col-span-3">
          <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#8d84ad]">Alerts by severity · 30d</div>
          <div className="mt-3 flex items-center justify-center">
            <svg width="150" height="150" viewBox="0 0 150 150">
              {(() => {
                let acc = 0;
                const R = 54, C = 2 * Math.PI * R;
                return severitySplit.map((s) => {
                  const frac = s.v / sevTotal;
                  const dash = frac * C;
                  const offset = acc;
                  acc += dash;
                  return (
                    <circle key={s.name} cx="75" cy="75" r={R} fill="none" stroke={s.fill} strokeWidth="17"
                      strokeDasharray={`${dash - 2.5} ${C - dash + 2.5}`} strokeDashoffset={-offset}
                      transform="rotate(-90 75 75)" strokeLinecap="round" opacity="0.92" />
                  );
                });
              })()}
              <text x="75" y="71" textAnchor="middle" fill="#f7f3e8" fontSize="21" fontWeight="700" fontFamily="Fraunces">{sevTotal.toLocaleString()}</text>
              <text x="75" y="89" textAnchor="middle" fill="#8d84ad" fontSize="8" fontFamily="JetBrains Mono" letterSpacing="2">ALERTS</text>
            </svg>
          </div>
          <div className="mt-2 space-y-1.5">
            {severitySplit.map((s) => (
              <div key={s.name} className="flex items-center gap-2 text-[10px]">
                <span className="h-2 w-2 rounded-sm" style={{ background: s.fill }} />
                <span className="text-[#b9b0d6]">{s.name}</span>
                <span className="ml-auto font-mono text-[9.5px] text-cream tabular">{s.v.toLocaleString()} <span className="text-[#6f658f]">({((s.v / sevTotal) * 100).toFixed(1)}%)</span></span>
              </div>
            ))}
          </div>
        </div>

        {/* Model quality gauges + funnel */}
        <div className="panel noise p-5 xl:col-span-5">
          <div className="flex items-center justify-between">
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#8d84ad]">Model quality & signal funnel</div>
            <BadgeCheck size={15} className="text-emerald-400" />
          </div>
          <div className="mt-3 flex items-center justify-around">
            <RingGauge pct={98.2} size={92} stroke={8} color={GOLD} label="PRECISION">
              <span className="font-display text-[15px] font-bold text-cream tabular">98.2</span>
            </RingGauge>
            <RingGauge pct={96.1} size={92} stroke={8} color={VIOL_SOFT} label="RECALL">
              <span className="font-display text-[15px] font-bold text-cream tabular">96.1</span>
            </RingGauge>
            <RingGauge pct={96.9} size={92} stroke={8} color={GREEN} label="F1 SCORE">
              <span className="font-display text-[15px] font-bold text-cream tabular">0.97</span>
            </RingGauge>
          </div>
          <div className="mt-4 space-y-1.5 border-t border-line pt-3">
            {funnel.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-[13px] rounded-sm" style={{ width: `${Math.max(4, f.v)}%`, minWidth: 10, background: i < 2 ? 'linear-gradient(90deg,#6d28d9,#8b5cf6)' : i < 3 ? 'linear-gradient(90deg,#d9a92e,#f4c64a)' : 'linear-gradient(90deg,#f4c64a,#fde68a)' }} />
                <span className="whitespace-nowrap text-[8.5px] text-[#b9b0d6]">{f.stage}</span>
                <span className="ml-auto font-mono text-[8px] text-[#6f658f] tabular">{f.pct}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 font-mono text-[8.5px] text-[#6f658f]"><Flame size={10} className="text-gold" /> Model retrained 2026-10-19 on 41M labeled fleet events · drift 3.1%</div>
        </div>
      </div>
    </div>
  );
}
