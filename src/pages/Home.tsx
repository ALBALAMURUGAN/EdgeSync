import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, ChevronDown, Play, Zap, ShieldCheck, Cpu, Cloud, Radio, Database,
  Activity, Gauge, Layers, Wrench, BadgeCheck, Quote, Server, Wifi, Thermometer,
  MemoryStick, Fan, ArrowDown,
} from 'lucide-react';
import { useSim } from '../lib/engine';
import { AnimatedNumber, LatencyChart, ThroughputChart, RingGauge, fmtCompact, GOLD, VIOL_SOFT } from '../lib/viz';
import { useToast, Logo } from '../components/Toast';

export default function Home() {
  const sim = useSim();
  const toast = useToast();
  const speedup = (sim.cloudMs / sim.edgeMs).toFixed(1);

  return (
    <div className="relative">
      {/* ================= HERO ================= */}
      <section className="relative flex min-h-[94vh] flex-col overflow-hidden">
        {/* backdrop */}
        <div className="absolute inset-0">
          <img src="/img/hero-factory.png" alt="Smart factory floor at night lit in violet and gold, with holographic telemetry overlays" className="h-full w-full object-cover object-[62%_center]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#06040c] via-[#06040c]/72 to-[#06040c]/5" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#06040c] via-transparent to-[#06040c]/60" />
          <div className="grid-bg absolute inset-0 opacity-60" />
        </div>
        {/* scan line */}
        <div aria-hidden className="scan-line absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-gold/14 to-transparent" style={{ filter: 'blur(2px)' }} />

        <div className="relative mx-auto flex w-full max-w-[1440px] flex-1 items-center px-4 pt-14 sm:px-6 lg:px-10">
          <div className="max-w-2xl pb-24 pt-6">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <span className="chip !border-gold/30 !bg-gold/8"><span className="h-1.5 w-1.5 rounded-full bg-gold pulse-dot" /> Live · 18 devices streaming from the Antwerp pilot</span>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.85, delay: 0.12 }} className="font-display mt-6 text-[44px] font-black leading-[0.98] tracking-[-0.02em] text-cream sm:text-6xl xl:text-[72px]">
              The cloud is<br />too far away<br /><span className="gold-text">for 4 milliseconds.</span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.28 }} className="mt-6 max-w-md text-[14px] leading-relaxed text-[#cfc8e8]">
              EdgeSync decides at the machine in <span className="font-mono font-bold text-gold">3.9 ms</span>, keeps operating when the uplink dies, and replays every lost packet to the cloud — exactly once, never dropped.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }} className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/console" className="btn-gold !px-6 !py-3.5 !text-[13px]">Open the Live Console <ArrowRight size={15} /></Link>
              <Link to="/outage" className="btn-ghost !px-6 !py-3.5 !text-[13px]"><Play size={14} className="text-gold" /> Simulate a network outage</Link>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.62 }} className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[8.5px] uppercase tracking-[0.18em] text-[#8d84ad]">
              <span className="flex items-center gap-1.5"><BadgeCheck size={11} className="text-emerald-400" /> 341M events · 0 lost</span>
              <span className="flex items-center gap-1.5"><BadgeCheck size={11} className="text-emerald-400" /> SOC 2 Type II</span>
              <span className="flex items-center gap-1.5"><BadgeCheck size={11} className="text-emerald-400" /> 24× P50 vs cloud path</span>
            </motion.div>
          </div>

          {/* Floating live HUD */}
          <div className="pointer-events-none absolute bottom-24 right-6 hidden w-[340px] xl:block">
            <motion.div initial={{ opacity: 0, x: 60, rotate: 2 }} animate={{ opacity: 1, x: 0, rotate: 0 }} transition={{ duration: 1, delay: 0.5, type: 'spring', damping: 18 }} className="animate-floaty pointer-events-auto">
              <div className="panel noise glow-viol bg-[#120e24]/90 p-4 backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <span className="font-mono text-[8px] uppercase tracking-[0.26em] text-gold">ERV-2201 · CNC Spindle</span>
                  <span className="flex items-center gap-1.5 font-mono text-[8px] text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" />LIVE</span>
                </div>
                <div className="mt-2.5 flex items-end justify-between">
                  <div>
                    <div className="font-mono text-[7.5px] uppercase tracking-[0.2em] text-[#8d84ad]">Vibration</div>
                    <div className="font-display text-3xl font-bold text-cream tabular">{sim.devices[0].value.toFixed(2)}<span className="ml-1 text-xs font-normal text-[#8d84ad]">mm/s</span></div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[7.5px] uppercase tracking-[0.2em] text-[#8d84ad]">Edge decision</div>
                    <div className="font-mono text-sm font-bold text-gold tabular">{sim.devices[0].lastDecisionMs.toFixed(1)} ms</div>
                  </div>
                </div>
                <div className="mt-2"><LatencyChart data={sim.latencyHist.slice(-36)} height={64} showArea={false} /></div>
                <div className="mt-2 flex items-center justify-between border-t border-line pt-2 font-mono text-[7.5px] text-[#6f658f]">
                  <span>ANOMALY {Math.round(sim.devices[0].anomaly)}/99</span>
                  <span>DECISION <span className="text-gold">KEEP</span></span>
                  <span>QOS-1</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Hero bottom stat bar */}
        <div className="relative border-t border-line2 bg-[#0a0714]/80 backdrop-blur-xl">
          <div className="mx-auto grid max-w-[1440px] grid-cols-2 divide-x divide-line sm:grid-cols-4">
            {[
              { k: <><AnimatedNumber value={sim.eps} /> <span className="text-sm">EPS</span></>, v: 'live ingest rate' },
              { k: <><AnimatedNumber value={sim.totals.events} format={fmtCompact} /></>, v: 'events synced to cloud · 0 loss' },
              { k: <span className="gold-text">{speedup}×</span>, v: 'edge vs cloud decision speed' },
              { k: <><AnimatedNumber value={sim.plantHealth} format={(x) => x.toFixed(1)} />%</>, v: 'aggregate plant health' },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5 px-4 py-3.5">
                <span className="font-display text-lg font-bold text-cream sm:text-xl tabular">{s.k}</span>
                <span className="font-mono text-[7px] uppercase tracking-[0.2em] text-[#8d84ad]">{s.v}</span>
              </div>
            ))}
          </div>
        </div>
        <a href="#problem" className="absolute bottom-[74px] left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-[#8d84ad] transition-colors hover:text-gold lg:flex"><ArrowDown size={14} className="animate-floaty2" /></a>
      </section>

      {/* ================= MARQUEE ================= */}
      <div className="relative border-b border-line2 bg-[#0b0817] py-3">
        <div className="animate-marquee flex w-max items-center whitespace-nowrap">
          {[0, 1].map((c) => (
            <span key={c} className="flex items-center" aria-hidden={c === 1}>
              {['React 19', 'Node.js 22', 'Python 3.12', 'MQTT 5.0', 'PostgreSQL 16', 'TimescaleDB', 'ONNX Runtime', 'EMQX', 'Kubernetes', 'K3s at the edge', 'Grafana', 'cosign OTA'].map((t) => (
                <span key={t} className="mx-8 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#6f658f]"><span className="h-1 w-1 rounded-full bg-gold/60" />{t}</span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ================= THE 4ms PROBLEM ================= */}
      <section id="problem" className="relative mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-10">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <span className="eyebrow">The problem with “cloud-first”</span>
            <h2 className="font-display mt-3 text-4xl font-black leading-[1.02] tracking-tight text-cream sm:text-5xl">Physics does not<br />wait for<br /><span className="violet-text">a round-trip.</span></h2>
            <p className="mt-5 max-w-md text-[13px] leading-relaxed text-[#a99dd0]">A bearing that sheds its spall signature fails in milliseconds. A cloud-first stack finds out ninety-six milliseconds later — if the link was up. EdgeSync shrinks the decision loop to the length of a single sensor sample.</p>
            <div className="mt-7 flex items-center gap-5">
              <RingGauge pct={96.9} size={110} stroke={9} color={GOLD} label="ACTUATIONS BEFORE CLOUD ACK">
                <span className="font-display text-[19px] font-bold text-cream tabular">96.9%</span>
              </RingGauge>
              <div className="text-[11px] leading-relaxed text-[#a99dd0]">of safety-relevant decisions at Antwerp were executed <span className="text-cream">before the cloud had even received the event.</span></div>
            </div>
          </div>

          {/* Latency face-off */}
          <div className="lg:col-span-7">
            <div className="panel noise p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] uppercase tracking-[0.26em] text-[#8d84ad]">Same event · two destinies · measured live</span>
                <span className="chip"><Radio size={9} /> LIVE FEED</span>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/40 bg-gold/10"><Cpu size={24} className="text-gold" /></div>
                  <div className="font-mono mt-3 text-[9px] uppercase tracking-[0.24em] text-gold">Edge path</div>
                  <div className="font-display mt-1 text-5xl font-black text-cream tabular sm:text-6xl">{sim.edgeMs.toFixed(1)}<span className="text-xl text-[#8d84ad]">ms</span></div>
                  <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.18em] text-[#6f658f]">sensor → inference → actuation</div>
                </div>
                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-viol/40 bg-viol/10"><Cloud size={24} className="text-violsoft" /></div>
                  <div className="font-mono mt-3 text-[9px] uppercase tracking-[0.24em] text-violsoft">Cloud path</div>
                  <div className="font-display mt-1 text-5xl font-black text-[#5d5478] tabular sm:text-6xl">{sim.cloudMs.toFixed(0)}<span className="text-xl text-[#463d61]">ms</span></div>
                  <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.18em] text-[#6f658f]">mqtt → broker → ingest → db → ack</div>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-center gap-3 border-t border-line pt-5">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
                <span className="font-display text-2xl font-black gold-text tabular">{speedup}×</span>
                <span className="font-mono text-[8.5px] uppercase tracking-[0.22em] text-[#a99dd0]">faster where it<br />matters most</span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= PROOF BAND (live) ================= */}
      <section className="relative border-y border-line2 bg-[#0a0817]">
        <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="eyebrow">Don't trust the deck — watch the fleet</span>
            <Link to="/analytics" className="font-mono text-[9px] uppercase tracking-[0.24em] text-gold hover:text-cream">Full analytics →</Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-12">
            <div className="panel noise p-4 md:col-span-5">
              <div className="flex items-center justify-between"><span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#8d84ad]">Events in / out · per second</span><span className="font-mono text-[9px] text-gold tabular">{sim.eps.toLocaleString()} EPS</span></div>
              <div className="mt-2"><ThroughputChart data={sim.throughputHist.slice(-30)} height={132} /></div>
              <div className="mt-1.5 flex gap-4 font-mono text-[7.5px] text-[#6f658f]"><span className="flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-sm bg-gold" /> ingested</span><span className="flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-sm bg-viol" /> synced to PostgreSQL</span></div>
            </div>
            <div className="panel noise p-4 md:col-span-4">
              <div className="flex items-center justify-between"><span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#8d84ad]">Decision latency · live</span><span className="font-mono text-[9px] text-cream tabular">P50 {sim.edgeMs.toFixed(1)} ms</span></div>
              <div className="mt-2"><LatencyChart data={sim.latencyHist.slice(-40)} height={132} /></div>
            </div>
            <div className="panel noise flex flex-col justify-between p-5 md:col-span-3" style={{ borderColor: 'rgba(244,198,74,0.28)' }}>
              <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-gold">Cumulative this session</span>
              <div>
                <div className="font-display mt-2 text-4xl font-black text-cream tabular"><AnimatedNumber value={sim.totals.events} format={fmtCompact} /></div>
                <div className="mt-1 text-[9.5px] leading-snug text-[#a99dd0]">events carried from sensor to PostgreSQL <span className="text-emerald-300">without a single loss</span></div>
              </div>
              <Link to="/console" className="mt-3 inline-flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-gold hover:text-cream">Enter mission control <ArrowRight size={10} /></Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CAPABILITIES ================= */}
      <section className="relative mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow">What EdgeSync actually does</span>
            <h2 className="font-display mt-3 max-w-xl text-4xl font-black leading-[1.02] tracking-tight text-cream">Six capabilities.<br /><span className="gold-text">One continuous reflex arc.</span></h2>
          </div>
          <Link to="/architecture" className="btn-ghost !py-2.5 text-[11px]">Read the architecture <ArrowRight size={13} /></Link>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Cpu, title: 'Edge autonomy', body: 'Full decision authority on the gateway. Safety interlocks fire in microseconds, whether or not anyone — or anything — answers.', stat: '3.9 ms', statLabel: 'P50 decision latency', to: '/console' },
            { icon: Database, title: 'Delta-store sync', body: 'NVRAM-backed queue absorbs any outage. QoS-1 exactly-once replay converges the cloud with zero conflicts.', stat: '0', statLabel: 'events lost, ever', to: '/outage' },
            { icon: Gauge, title: 'Anomaly intelligence', body: 'vib-anomaly-v3.2 scores every reading: isolation forest + gradient boosting, F1 0.97 on 41M labeled events.', stat: '98.2%', statLabel: 'precision @ 1.8% FPR', to: '/analytics' },
            { icon: Activity, title: 'Living digital twin', body: 'Two sites, eighteen machines, one map. Every sensor, every heartbeat, every drift — on one wall.', stat: '18 / 18', statLabel: 'devices in twin, live', to: '/fleet' },
            { icon: Layers, title: 'Hot & cold paths', body: 'Actuation on the hot path. Everything else — history, aggregates, BI — on the cold path to PostgreSQL.', stat: '96.9%', statLabel: 'decisions that never touch WAN', to: '/architecture' },
            { icon: Wrench, title: 'Failure lasts 26 s', body: 'Inject a heartbeat loss and watch: quarantine in 3 s, safe state in 4 ms, rejoin + replay in under 30 s.', stat: '26 s', statLabel: 'median MTTR, simulated & real', to: '/console' },
          ].map(({ icon: I, title, body, stat, statLabel, to }) => (
            <Link key={title} to={to} className="panel noise panel-hover group flex flex-col p-6">
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold/30 bg-gold/8 text-gold transition-transform duration-300 group-hover:scale-110"><I size={19} strokeWidth={1.6} /></span>
                <div className="text-right">
                  <div className="font-display text-[22px] font-bold leading-none text-cream tabular">{stat}</div>
                  <div className="mt-1 max-w-[120px] font-mono text-[6.5px] uppercase leading-snug tracking-[0.14em] text-[#8d84ad]">{statLabel}</div>
                </div>
              </div>
              <div className="mt-4 text-[15px] font-extrabold text-cream">{title}</div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[#a99dd0]">{body}</p>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-4 font-mono text-[8.5px] font-bold uppercase tracking-[0.22em] text-gold opacity-0 transition-all duration-300 group-hover:opacity-100">Explore <ArrowRight size={10} /></span>
            </Link>
          ))}
        </div>
      </section>

      {/* ================= GATEWAY PRODUCT ================= */}
      <section className="relative border-t border-line2">
        <div className="mx-auto grid max-w-[1440px] items-stretch gap-0 lg:grid-cols-2">
          <div className="relative flex items-center justify-center overflow-hidden bg-[#0b0816] p-8 lg:p-14">
            <div aria-hidden className="absolute left-1/2 top-1/2 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-viol/16 blur-[120px]" />
            <img src="/img/edge-gateway.png" alt="EdgeSync ERV-G2 edge gateway — matte black enclosure, gold trim, violet status ring" className="animate-floaty relative w-full max-w-[430px] object-contain mix-blend-lighten" style={{ filter: 'drop-shadow(0 30px 60px rgba(109,40,217,0.45))' }} />
          </div>
          <div className="relative flex flex-col justify-center border-t border-line2 px-6 py-12 lg:border-l lg:border-t-0 lg:px-14">
            <span className="eyebrow">In the box</span>
            <h2 className="font-display mt-3 text-4xl font-black tracking-tight text-cream">ERV-G2.<br /><span className="gold-text">The 4-millisecond computer.</span></h2>
            <p className="mt-4 max-w-md text-[13px] leading-relaxed text-[#a99dd0]">A fanless, NVRAM-backed edge gateway that runs the same K3s manifest as the cloud — because we build one platform, not two.</p>
            <div className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5">
              {[
                { icon: Zap, k: '4 ms', v: 'warm-path actuation, worst case' },
                { icon: Thermometer, k: '-40 to 85 °C', v: 'operating envelope, fanless' },
                { icon: MemoryStick, k: 'NVRAM delta store', v: '4,096-packet buffer, power-fail safe' },
                { icon: Wifi, k: 'LTE-M + fiber + Wi-Fi 6', v: 'triple-redundant uplink' },
                { icon: Fan, k: '0 fans · 9 W', v: 'convection cooled, DIN-rail' },
                { icon: Server, k: 'Signed OTA', v: 'cosign bundles, ring rollouts, watchdog rollback' },
              ].map(({ icon: I, k, v }) => (
                <div key={k} className="flex items-start gap-2.5">
                  <I size={15} className="mt-0.5 shrink-0 text-violsoft" strokeWidth={1.6} />
                  <span><span className="block font-mono text-[11px] font-bold text-cream">{k}</span><span className="mt-0.5 block text-[9px] leading-snug text-[#8d84ad]">{v}</span></span>
                </div>
              ))}
            </div>
            <button className="btn-gold mt-8 w-fit" onClick={() => toast('Spec sheet requested', 'erv-g2-datasheet.pdf will land in your inbox within the minute.')}>Request the datasheet <ArrowRight size={14} /></button>
          </div>
        </div>
      </section>

      {/* ================= PROOF POINTS / TESTIMONIALS ================= */}
      <section className="relative mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow">The pilot ledger</span>
            <h2 className="font-display mt-3 max-w-lg text-4xl font-black leading-[1.02] tracking-tight text-cream">Numbers the Antwerp<br />pilot won't let us <span className="violet-text">oversell.</span></h2>
          </div>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { q: 'A spall signature on bearing 7A fired the interlock in 3.8 ms. The cloud log arrived 94 ms later, confused. EdgeSync was not confused.', a: 'Leen Vandenberghe', r: 'VP of Manufacturing · Antwerp Coastal Works', tag: '$212k line-stop averted' },
            { q: 'We cut the uplink for drills every Friday. Forty-one times. Zero packets lost, zero false safe-states, zero signatures from the insurance carrier asking why.', a: 'Marc De Wilde', r: 'Head of Plant Reliability · Erpe-Mere Casting', tag: '41 drills · 0 loss' },
            { q: 'Our BI team finally sees 100% of the window they analyze. Edge holds the hot truth, PostgreSQL holds the whole truth, and both agree to the millisecond.', a: 'Prof. Aïcha Benali', r: 'Data Science Lead · Flanders Mechatronics Lab', tag: '341M events · 0 conflicts' },
          ].map(({ q, a, r, tag }) => (
            <figure key={a} className="panel noise panel-hover flex flex-col p-6">
              <Quote size={20} className="text-gold/70" fill="currentColor" strokeWidth={0} />
              <blockquote className="mt-3 text-[12px] leading-relaxed text-[#d7d0ec]">“{q}”</blockquote>
              <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4">
                <figcaption>
                  <div className="text-[11.5px] font-extrabold text-cream">{a}</div>
                  <div className="mt-0.5 text-[9px] leading-snug text-[#8d84ad]">{r}</div>
                </figcaption>
                <span className="chip shrink-0 !text-emerald-300" style={{ borderColor: 'rgba(52,211,153,0.3)' }}>{tag}</span>
              </div>
            </figure>
          ))}
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="relative overflow-hidden border-t border-line2">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0714] via-[#131024] to-[#0a0714]" />
        <div aria-hidden className="absolute -bottom-40 left-1/2 h-96 w-[64rem] -translate-x-1/2 rounded-full bg-violdeep/20 blur-[150px]" />
        <div className="grid-bg absolute inset-0 opacity-50" />
        <div className="relative mx-auto max-w-[1440px] px-4 py-20 text-center sm:px-6 lg:px-10">
          <Logo compact />
          <h2 className="font-display mx-auto mt-6 max-w-4xl text-5xl font-black leading-[0.98] tracking-tight text-cream sm:text-6xl">Your machines won't<br />wait. <span className="gold-text">Neither will we.</span></h2>
          <p className="mx-auto mt-5 max-w-md text-[13px] leading-relaxed text-[#a99dd0]">Stand up a two-site pilot in under six weeks — gateway racks included, replay guaranteed, loss impossible.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button className="btn-gold !px-7 !py-4 !text-[13px]" onClick={() => toast('Pilot assessment requested', 'Our field engineering team will reach out within one business day with a site survey plan.')}>Book a site survey <ArrowRight size={15} /></button>
            <Link to="/architecture" className="btn-ghost !px-7 !py-4 !text-[13px]">Read the architecture</Link>
          </div>
          <ChevronDown size={16} className="mx-auto mt-10 text-[#6f658f]" />
        </div>
      </section>
    </div>
  );
}
