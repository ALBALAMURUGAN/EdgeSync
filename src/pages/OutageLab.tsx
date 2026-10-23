import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CloudOff, CloudSun, Zap, RotateCcw, ChevronRight, Database, Radio, Server,
  ShieldCheck, ArrowRightLeft, CheckCircle2, Loader2, CircleAlert, CloudUpload,
} from 'lucide-react';
import { useSim, engine } from '../lib/engine';
import { FlowDiagram, RingGauge, GOLD, VIOL_SOFT, GREEN, RED } from '../lib/viz';
import { useToast } from '../components/Toast';

type MilestoneState = 'pending' | 'active' | 'done';

export default function OutageLab() {
  const sim = useSim();
  const toast = useToast();
  const [progress, setProgress] = useState<number>(sim.outage.phase === 'up' && sim.outage.lastSync ? 100 : 0);
  const phase = sim.outage.phase;

  /* sync progress animation driven by real queue drain */
  useEffect(() => {
    if (phase === 'restoring') {
      // progress derives from drained fraction of this restore window
      const total = sim.outage.drained + sim.outage.queued;
      const p = total > 0 ? (sim.outage.drained / total) * 100 : 100;
      setProgress(Math.round(p));
    } else if (phase === 'up' && sim.outage.lastSync) {
      setProgress(100);
    } else if (phase === 'out') {
      setProgress(0);
    }
  }, [phase, sim.outage.drained, sim.outage.queued, sim.outage.lastSync]);

  /* fire a toast when a sync completes */
  const lastSyncRef = useRef(sim.outage.lastSync);
  useEffect(() => {
    if (sim.outage.lastSync && sim.outage.lastSync !== lastSyncRef.current) {
      toast('Delta sync complete', `${sim.outage.lastSync.drained.toLocaleString()} packets replayed exactly-once · ${(sim.outage.lastSync.windowMs / 1000).toFixed(1)}s · 0 conflicts.`);
    }
    lastSyncRef.current = sim.outage.lastSync;
  }, [sim.outage.lastSync, toast]);

  /* milestones */
  const ms: MilestoneState[] = useMemo(() => {
    if (phase === 'up' && !sim.outage.lastSync) return ['pending', 'pending', 'pending', 'done'];
    if (phase === 'up') return ['done', 'done', 'done', 'done'];
    if (phase === 'out') {
      const elapsed = sim.outage.total - sim.outage.remaining;
      return ['done', elapsed > 2 ? 'done' : 'active', 'active', 'pending'];
    }
    return ['done', 'done', 'done', 'active'];
  }, [phase, sim.outage.remaining, sim.outage.total, sim.outage.lastSync]);

  const milestones = [
    { title: 'WAN uplink severed', sub: 'Carrier drops BGP session to eu-central-1' },
    { title: 'Edge autonomy engaged', sub: 'Local safety loops armed · actuation at 4 ms' },
    { title: 'Delta queue accumulating', sub: 'QoS-1 packets buffered in edge store' },
    { title: 'Delta sync & zero loss', sub: 'Exactly-once replay · conflict-free merge' },
  ];

  const queued = sim.outage.queued;
  const drainPerSec = phase === 'restoring' ? Math.max(140, Math.floor(queued / 4.5)) : phase === 'out' ? 0 : 0;
  const loadPct = phase === 'out' ? 100 : phase === 'restoring' ? Math.min(100, Math.round((drainPerSec / 420) * 100)) : 0;

  const siteADevices = sim.devices.filter((d) => d.site === 'site-a');
  const failedCount = siteADevices.filter((d) => d.status === 'failed').length;
  const nominalCount = siteADevices.length - failedCount;

  return (
    <div className="relative mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10">
      <div aria-hidden className="pointer-events-none absolute -top-36 right-10 h-[28rem] w-[28rem] rounded-full bg-red-500/6 blur-[160px]" />
      <div aria-hidden className="pointer-events-none absolute top-64 left-0 h-96 w-96 rounded-full bg-gold/7 blur-[150px]" />

      {/* ===== Header ===== */}
      <div className="relative mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Outage Lab · chaos engineering</span>
          <h1 className="font-display mt-2 text-4xl font-black tracking-tight text-cream">Kill the uplink.<br /><span className="gold-text">Watch the edge hold the line.</span></h1>
          <p className="mt-2 max-w-lg text-[12px] leading-relaxed text-[#a99dd0]">A live, simulated severance of Site A's WAN connection. Edge nodes keep deciding, machines keep their safety margins, telemetry queues locally — then everything replays to the cloud, exactly once.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#8d84ad]">Scenario · Carriageway fiber cut</div>
          <div className="font-mono text-[10px] text-[#6f658f]">duration 20.0s · scope SITE-A only · Site B unaffected</div>
        </div>
      </div>

      {/* ===== Main stage ===== */}
      <div className="relative grid gap-5 xl:grid-cols-12">
        {/* Left: stage */}
        <div className={`panel noise overflow-hidden xl:col-span-8 transition-shadow duration-700 ${phase === 'out' ? 'glow-gold' : 'glow-viol'}`}>
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <div className="flex items-center gap-2.5">
              {phase === 'out' ? <CloudOff size={14} className="text-red-400" /> : phase === 'restoring' ? <CloudUpload size={14} className="text-gold" /> : <CloudSun size={14} className="text-emerald-400" />}
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cream">
                {phase === 'up' && 'LINK HEALTHY — TELEMETRY FLOWING'}
                {phase === 'out' && 'LINK SEVERED — EDGE AUTONOMY'}
                {phase === 'restoring' && 'LINK RESTORED — DRAINING DELTA'}
              </span>
            </div>
            {phase === 'out' && (
              <span className="font-mono text-[10px] font-bold text-red-300 tabular">-{sim.outage.remaining}.0s</span>
            )}
            {phase === 'restoring' && (
              <span className="flex items-center gap-2 font-mono text-[9px] font-bold text-gold"><Loader2 size={11} className="animate-spin" /> REPLAYING</span>
            )}
          </div>

          {/* The big flow */}
          <div className="relative px-4 pt-5">
            {phase === 'out' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pointer-events-none absolute inset-x-8 top-0 z-10 h-px overflow-visible">
                <div className="absolute left-1/2 top-2 h-[3px] w-40 -translate-x-1/2 bg-gradient-to-r from-transparent via-red-500 to-transparent blur-[2px]" />
              </motion.div>
            )}
            <FlowDiagram mode={phase === 'up' ? (sim.outage.lastSync ? 'restored' : 'marketing') : phase === 'out' ? 'outage' : 'restored'} />
          </div>

          {/* Outage control deck */}
          <div className="border-t border-line p-5">
            <div className="flex flex-col items-center gap-5 md:flex-row">
              {/* Big button */}
              <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
                {phase === 'up' ? (
                  <>
                    <span className="absolute inset-0 animate-ping rounded-full bg-red-500/10" style={{ animationDuration: '2.4s' }} />
                    <button onClick={() => { engine.triggerOutage(); toast('Outage injected', 'Site A WAN severed. Edge nodes switched to autonomy in <50 ms.'); }} className="group relative flex h-32 w-32 flex-col items-center justify-center gap-1 rounded-full border-2 border-red-500/60 bg-gradient-to-b from-[#3d1418] to-[#20090c] text-red-300 shadow-[0_0_50px_-10px_rgba(248,113,113,0.45),inset_0_2px_8px_rgba(248,113,113,0.25)] transition-all duration-200 hover:border-red-400 hover:text-red-200 active:scale-95">
                      <Zap size={26} strokeWidth={1.8} className="transition-transform duration-200 group-hover:scale-110" />
                      <span className="font-mono text-[8.5px] font-bold uppercase tracking-[0.18em]">Simulate<br />Outage</span>
                    </button>
                  </>
                ) : (
                  <div className="flex h-32 w-32 flex-col items-center justify-center gap-1 rounded-full border-2 border-gold/50 bg-gradient-to-b from-[#2c2410] to-[#171106] text-gold shadow-[0_0_50px_-10px_rgba(244,198,74,0.4)]">
                    {phase === 'out' ? <Loader2 size={24} className="animate-spin" strokeWidth={1.8} /> : <ArrowRightLeft size={24} strokeWidth={1.8} />}
                    <span className="font-mono text-[8.5px] font-bold uppercase tracking-[0.18em]">{phase === 'out' ? 'Outage' : 'Syncing'}<br />{phase === 'out' ? 'In Progress' : 'Delta Queue'}</span>
                  </div>
                )}
              </div>

              {/* Stats grid */}
              <div className="grid w-full grid-cols-2 gap-3">
                {[
                  { icon: Database, label: 'Delta queue (Site A)', value: queued.toLocaleString(), sub: phase === 'up' && sim.outage.lastSync ? `last replay: ${sim.outage.lastSync.drained.toLocaleString()} pkts · ${(sim.outage.lastSync.windowMs / 1000).toFixed(1)}s` : phase === 'out' ? 'buffering in edge delta store' : `${drainPerSec.toLocaleString()} pkts/s draining`, tone: queued > 0 ? 'text-gold' : 'text-emerald-300' },
                  { icon: Server, label: 'Edge autonomy', value: '100%', sub: 'safety loops guaranteed by gateway firmware', tone: 'text-gold' },
                  { icon: Radio, label: 'Packet loss during outage', value: '0', sub: 'QoS-1 exactly-once delivery contract', tone: 'text-emerald-300' },
                  { icon: ShieldCheck, label: 'Machines at safe state', value: `${nominalCount}/${siteADevices.length}`, sub: failedCount ? `${failedCount} under injected fault watch` : 'full fleet nominally governed locally', tone: failedCount ? 'text-red-300' : 'text-cream' },
                ].map(({ icon: I, label, value, sub, tone }) => (
                  <div key={label} className="rounded-xl border border-line2 bg-panel2 p-3">
                    <div className="flex items-center gap-1.5 font-mono text-[7.5px] uppercase tracking-[0.18em] text-[#8d84ad]"><I size={10} />{label}</div>
                    <div className={`font-display mt-1 text-[21px] font-semibold leading-none ${tone} tabular`}>{value}</div>
                    <div className="mt-1 text-[8px] leading-snug text-[#6f658f]">{sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Edge-vs-cloud load balance bar */}
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.2em]">
                <span className="text-gold">Edge workload</span>
                <span className="text-[#6f658f]">{phase === 'out' ? 'local-only mode' : phase === 'restoring' ? 'replaying' : 'steady state'}</span>
                <span className="text-violsoft">Cloud workload</span>
              </div>
              <div className="flex h-3 overflow-hidden rounded-full border border-line2">
                <div className="bg-gradient-to-r from-golddeep to-gold transition-all duration-700" style={{ width: `${phase === 'out' ? 100 : phase === 'restoring' ? 62 : 38}%` }} />
                <div className="flex-1 bg-gradient-to-r from-violdeep to-viol transition-all duration-700" />
              </div>
              <div className="mt-1 flex justify-between font-mono text-[8px] text-[#6f658f]">
                <span>{phase === 'out' ? '100% edge' : phase === 'restoring' ? '62% edge · replay burst' : '38% edge · 62% cloud'}</span>
                <span>{phase === 'up' ? 'direct flow' : 'zstd-compressed chunks'}</span>
              </div>
            </div>

            {/* Sync progress (restoring) */}
            {(phase === 'restoring' || (phase === 'up' && progress === 100 && sim.outage.lastSync)) && (
              <div className="mt-4 rounded-xl border border-gold/25 bg-gold/5 p-4">
                <div className="flex items-center justify-between font-mono text-[9px] font-bold uppercase tracking-[0.2em]">
                  <span className="flex items-center gap-2 text-gold">{phase === 'restoring' ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />} Delta replay {phase === 'restoring' ? 'in progress' : 'complete'}</span>
                  <span className="text-cream tabular">{phase === 'restoring' ? `${progress}%` : '100%'}</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#221c38]">
                  <div className="h-full rounded-full bg-gradient-to-r from-golddeep via-gold to-[#fff3b8] transition-all duration-500" style={{ width: `${phase === 'restoring' ? progress : 100}%` }} />
                </div>
                {phase === 'up' && sim.outage.lastSync && (
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[8.5px] text-[#a99dd0]">
                    <span>replayed <span className="text-gold">{sim.outage.lastSync.drained.toLocaleString()}</span> packets</span>
                    <span>window <span className="text-cream">{(sim.outage.lastSync.windowMs / 1000).toFixed(1)}s</span></span>
                    <span>conflicts <span className="text-emerald-300">0</span></span>
                    <span>lost <span className="text-emerald-300">0</span></span>
                    <span>vector-clock merge</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: milestone timeline */}
        <div className="xl:col-span-4 flex flex-col gap-5">
          <div className="panel noise p-5">
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#8d84ad]">Outage chronology</div>
            <div className="mt-3">
              {milestones.map((m, i) => {
                const state = ms[i];
                return (
                  <div key={i} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < milestones.length - 1 && <span className={`absolute left-[7px] top-5 h-full w-px ${state === 'done' ? 'bg-gold/60' : 'bg-line2'}`} />}
                    <span className={`relative z-10 mt-0.5 flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border ${state === 'done' ? 'border-gold bg-gold text-[#231a05]' : state === 'active' ? 'border-gold bg-transparent' : 'border-line2 bg-panel2'}`}>
                      {state === 'done' ? <CheckCircle2 size={11} /> : state === 'active' ? <span className="h-1.5 w-1.5 animate-ping rounded-full bg-gold" /> : <span className="h-1.5 w-1.5 rounded-full bg-[#332a54]" />}
                    </span>
                    <div>
                      <div className={`text-[11px] font-bold leading-tight ${state === 'pending' ? 'text-[#6f658f]' : 'text-cream'}`}>{m.title}</div>
                      <div className="mt-0.5 text-[9px] leading-snug text-[#8d84ad]">{m.sub}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Side-by-side comparison card */}
          <div className="panel noise flex-1 p-5">
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#8d84ad]">Same window, with vs without edge</div>
            <div className="mt-3 space-y-3">
              <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/5 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[11px] font-bold text-emerald-300"><ShieldCheck size={13} /> EdgeSync architecture</span>
                  <span className="font-mono text-[9px] font-bold text-emerald-300">0 LOSS</span>
                </div>
                <ul className="mt-2 space-y-1 text-[9px] leading-relaxed text-[#a99dd0]">
                  <li className="flex gap-1.5"><ChevronRight size={10} className="mt-0.5 shrink-0 text-gold" />Safety interlock cut press #7 feed in 4 ms during vibration spike</li>
                  <li className="flex gap-1.5"><ChevronRight size={10} className="mt-0.5 shrink-0 text-gold" />3,912 readings queued, replayed exactly-once on restore</li>
                  <li className="flex gap-1.5"><ChevronRight size={10} className="mt-0.5 shrink-0 text-gold" />Consistency convergence in 4.3 s — full audit trail</li>
                </ul>
              </div>
              <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[11px] font-bold text-red-300"><CircleAlert size={13} /> Naive cloud-only</span>
                  <span className="font-mono text-[9px] font-bold text-red-300">3,912 LOST</span>
                </div>
                <ul className="mt-2 space-y-1 text-[9px] leading-relaxed text-[#a99dd0]">
                  <li className="flex gap-1.5"><ChevronRight size={10} className="mt-0.5 shrink-0 text-red-400" />First actuation after link drop: never — no local decision loop</li>
                  <li className="flex gap-1.5"><ChevronRight size={10} className="mt-0.5 shrink-0 text-red-400" />Every MQTT QoS-0 publish during outage: silently discarded</li>
                  <li className="flex gap-1.5"><ChevronRight size={10} className="mt-0.5 shrink-0 text-red-400" />Outage window invisible to BI until backfill — never arrived</li>
                </ul>
              </div>
              <button className="btn-ghost w-full justify-center !py-2 text-[11px]" onClick={() => toast('Chaos report exported', 'outage-2026-10-23-site-a.pdf · full packet-level timeline attached.')}>
                <RotateCcw size={13} /> Export chaos report (PDF)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Bottom band: live queue depth ===== */}
      <div className="relative mt-5 grid gap-4 md:grid-cols-3">
        <QueueDepthTile queued={queued} phase={phase} />
        <div className="panel noise flex items-center justify-between gap-4 p-5">
          <RingGauge pct={phase === 'out' ? 100 : phase === 'restoring' ? Math.max(8, 100 - progress) : 100} size={92} stroke={9} color={phase === 'up' ? GREEN : GOLD}>
            <span className="font-display text-[16px] font-bold text-cream tabular">{phase === 'up' ? 'OK' : phase === 'out' ? 'HOLD' : `${progress}%`}</span>
          </RingGauge>
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#8d84ad]">Reduction contract</div>
            <div className="mt-1 text-[11px] leading-snug text-[#c9c2e0]">20-second outage ⇒<br /><span className="font-bold text-cream">zero actuation gap</span><br /><span className="font-bold text-cream">zero telemetry loss</span></div>
          </div>
        </div>
        <div className="panel noise flex flex-col justify-center p-5">
          <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#8d84ad]">The math your CFO cares about</div>
          <div className="font-display mt-1.5 text-3xl font-black text-cream"><span className="gold-text">$212,400</span></div>
          <div className="mt-1 text-[10px] leading-snug text-[#a99dd0]">Avg. loss averted per prevented 20-minute line-stop — across 31 edge-intercepted incidents on this fleet, trailing 12 months.</div>
        </div>
      </div>
    </div>
  );
}

function QueueDepthTile({ queued, phase }: { queued: number; phase: 'up' | 'out' | 'restoring' }) {
  const max = 3200;
  const pct = Math.min(100, (queued / max) * 100);
  return (
    <div className="panel noise p-5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#8d84ad]">Delta-store depth · Site A</span>
        <span className={`font-mono text-[8px] font-bold uppercase tracking-[0.2em] ${phase === 'up' ? 'text-emerald-300' : 'text-gold'}`}>{phase === 'up' ? 'steady' : phase === 'out' ? 'filling' : 'draining'}</span>
      </div>
      <div className="font-display mt-2 text-3xl font-bold text-cream tabular">{queued.toLocaleString()} <span className="text-sm font-normal text-[#8d84ad]">packets</span></div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#221c38]">
        <div className="h-full rounded-full bg-gradient-to-r from-golddeep to-gold transition-all duration-700" style={{ width: `${Math.max(pct, phase === 'up' ? 0 : 4)}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[7.5px] text-[#6f658f]"><span>0</span><span>capacity {max.toLocaleString()} · NVRAM-backed</span></div>
    </div>
  );
}
