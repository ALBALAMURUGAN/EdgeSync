/* EdgeSync — Live simulation engine.
   A deterministic-enough physics/random-walk model of a two-site industrial
   deployment: 20 sensors, an edge decision loop, a cloud sync channel,
   a WAN outage simulator with delta-queue drain, anomaly scoring and
   device-failure injection. Runs in a singleton, ticks once per second. */

import { useSyncExternalStore } from 'react';

export type SiteId = 'site-a' | 'site-b';
export type DeviceStatus = 'online' | 'warning' | 'critical' | 'failed';
export type Severity = 'critical' | 'warning' | 'info';
export type OutagePhase = 'up' | 'out' | 'restoring';

export interface DeviceSim {
  id: string;
  name: string;
  kind: string;
  metric: string;
  unit: string;
  site: SiteId;
  base: number;
  spread: number;
  warnAt: number;
  critAt: number;
  value: number;
  hist: number[];
  health: number;
  anomaly: number;
  queued: number;
  status: DeviceStatus;
  anomalyTicks: number;
  cooldownUntil: number;
  failAt: number | null;
  recoverAt: number | null;
  lastDecisionMs: number;
}

export interface AlertItem {
  id: number; ts: number; sev: Severity;
  device: string; title: string; detail: string; score: number;
}

export interface LogEntry { id: number; ts: number; level: string; text: string }

export interface OutageState {
  phase: OutagePhase;
  remaining: number;
  total: number;
  queued: number;      // packets currently buffered at edge for Site A
  drained: number;     // packets drained during the current restore
  lastSync: { drained: number; windowMs: number; outageSecs: number } | null;
}

export interface LatencyPoint { t: number; edge: number; cloud: number }
export interface ThroughputPoint { t: number; ingested: number; synced: number }

export interface SimState {
  tick: number;
  upSecs: number;
  devices: DeviceSim[];
  alerts: AlertItem[];
  log: LogEntry[];
  outage: OutageState;
  edgeMs: number;
  cloudMs: number;
  latencyHist: LatencyPoint[];
  throughputHist: ThroughputPoint[];
  eps: number;
  plantHealth: number;
  totals: {
    events: number;
    edgeDecisions: number;
    cloudAcks: number;
    anomaliesCaught: number;
    failuresInjected: number;
    downtimeAvoidedS: number;
    bytesSyncedMB: number;
  };
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

let uid = 1;

/* Deterministic pseudo-noise so seeded history looks organic */
function seededWave(seed: number, i: number) {
  return (
    Math.sin(i * 0.31 + seed * 1.7) * 0.55 +
    Math.sin(i * 0.83 + seed * 3.1) * 0.3 +
    Math.sin(i * 1.7 + seed * 0.7) * 0.15
  );
}

interface DeviceSeed {
  id: string; name: string; kind: string; metric: string; unit: string;
  site: SiteId; base: number; spread: number; warnAt: number; critAt: number; dec: number;
}

const SEEDS: DeviceSeed[] = [
  { id: 'ERV-2201', name: 'CNC Spindle Motor', kind: 'CNC Spindle', metric: 'Vibration', unit: 'mm/s', site: 'site-a', base: 2.35, spread: 0.32, warnAt: 3.6, critAt: 4.6, dec: 2 },
  { id: 'ERV-2214', name: 'Bearing Pod 7A', kind: 'Vibration Pod', metric: 'Vibration', unit: 'mm/s', site: 'site-a', base: 2.9, spread: 0.42, warnAt: 4.1, critAt: 5.2, dec: 2 },
  { id: 'ERV-2307', name: 'Smelter Thermal Cam', kind: 'Thermal Camera', metric: 'Temperature', unit: '°C', site: 'site-a', base: 68, spread: 5.5, warnAt: 84, critAt: 94, dec: 1 },
  { id: 'ERV-2319', name: 'Press Line Power', kind: 'Power Meter', metric: 'Active Power', unit: 'kW', site: 'site-a', base: 412, spread: 34, warnAt: 520, critAt: 565, dec: 0 },
  { id: 'ERV-2342', name: 'Air Compressor K2', kind: 'Pressure Sensor', metric: 'Line Pressure', unit: 'bar', site: 'site-a', base: 6.15, spread: 0.35, warnAt: 7.35, critAt: 8.1, dec: 2 },
  { id: 'ERV-2360', name: 'Coolant Loop Flow', kind: 'Flow Sensor', metric: 'Flow Rate', unit: 'L/min', site: 'site-a', base: 148, spread: 11, warnAt: 205, critAt: 232, dec: 0 },
  { id: 'ERV-2401', name: 'Gearbox Oil Temp', kind: 'Thermal Camera', metric: 'Oil Temperature', unit: '°C', site: 'site-a', base: 74, spread: 6, warnAt: 92, critAt: 101, dec: 1 },
  { id: 'ERV-2418', name: 'Oven Chamber North', kind: 'Env Chamber', metric: 'Humidity', unit: '%RH', site: 'site-a', base: 41, spread: 3.4, warnAt: 55, critAt: 62, dec: 1 },
  { id: 'ERV-2433', name: 'Robot Arm Wrist', kind: 'Vibration Pod', metric: 'Torque Ripple', unit: 'Nm', site: 'site-a', base: 88, spread: 9, warnAt: 122, critAt: 141, dec: 1 },
  { id: 'ERV-2455', name: 'Substation Feed A', kind: 'Power Meter', metric: 'Current', unit: 'A', site: 'site-a', base: 385, spread: 27, warnAt: 480, critAt: 530, dec: 0 },
  { id: 'ANT-3104', name: 'Turbine Gearbox', kind: 'CNC Spindle', metric: 'Vibration', unit: 'mm/s', site: 'site-b', base: 1.9, spread: 0.3, warnAt: 3.4, critAt: 4.4, dec: 2 },
  { id: 'ANT-3111', name: 'Coating Line Temp', kind: 'Thermal Camera', metric: 'Temperature', unit: '°C', site: 'site-b', base: 61, spread: 4.6, warnAt: 78, critAt: 88, dec: 1 },
  { id: 'ANT-3126', name: 'Harbor Crane Drive', kind: 'Power Meter', metric: 'Active Power', unit: 'kW', site: 'site-b', base: 296, spread: 22, warnAt: 385, critAt: 428, dec: 0 },
  { id: 'ANT-3133', name: 'Paint Booth Pressure', kind: 'Pressure Sensor', metric: 'Differential', unit: 'Pa', site: 'site-b', base: 118, spread: 12, warnAt: 178, critAt: 205, dec: 0 },
  { id: 'ANT-3147', name: 'AGV Fleet Hub', kind: 'Env Chamber', metric: 'Battery Avg', unit: '%', site: 'site-b', base: 87, spread: 3.1, warnAt: 62, critAt: 45, dec: 1 },
  { id: 'ANT-3162', name: 'Cold Storage Room', kind: 'Env Chamber', metric: 'Temperature', unit: '°C', site: 'site-b', base: -18.4, spread: 1.1, warnAt: -12.5, critAt: -9.5, dec: 1 },
  { id: 'ANT-3170', name: 'HVAC Rooftop Unit', kind: 'Air Flow', metric: 'Static Pressure', unit: 'Pa', site: 'site-b', base: 342, spread: 21, warnAt: 430, critAt: 472, dec: 0 },
  { id: 'ANT-3181', name: 'Chiller Bearing Pod', kind: 'Vibration Pod', metric: 'Vibration', unit: 'mm/s', site: 'site-b', base: 2.1, spread: 0.3, warnAt: 3.7, critAt: 4.7, dec: 2 },
];

function buildDevice(seed: DeviceSeed, idx: number, now: number): DeviceSim {
  const hist: number[] = [];
  for (let i = 0; i < 48; i++) {
    const t = i - 47;
    const wave = seededWave(idx * 7.3 + 2.1, i) * seed.spread * 1.15;
    const drift = Math.sin(i * 0.09 + idx) * seed.spread * 0.6;
    hist.push(+(seed.base + wave + drift + rand(-0.3, 0.3) * seed.spread).toFixed(2));
  }
  const value = hist[hist.length - 1];
  return {
    ...seed,
    value,
    hist,
    health: rand(88, 99),
    anomaly: rand(4, 22),
    queued: 0,
    status: 'online',
    anomalyTicks: 0,
    cooldownUntil: 0,
    failAt: null,
    recoverAt: null,
    lastDecisionMs: rand(2.8, 5.4),
  };
}

function deriveStatus(d: DeviceSim): DeviceStatus {
  if (d.failAt !== null && d.recoverAt !== null) return 'failed';
  const over = d.site === 'site-b' && d.kind === 'Env Chamber' && d.metric === 'Battery Avg'
    ? d.base - d.value          // battery: lower is worse
    : d.value - d.base;         // default: higher is worse
  const warnBand = (d.warnAt - d.base);
  const critBand = (d.critAt - d.base);
  const ratio = critBand !== 0 ? over / critBand : 0;
  if (ratio >= 0.78 || d.anomaly > 78) return 'critical';
  if (over > warnBand * 0.55 || d.anomaly > 52) return 'warning';
  return 'online';
}

function buildInitialState(): SimState {
  const now = Date.now();
  const devices = SEEDS.map((s, i) => buildDevice(s, i, now));
  // Schedule the first organic failure ~70s in so watchers see it happen
  const victim = devices.find((d) => d.id === 'ERV-2214')!;
  victim.failAt = now + 70_000;
  victim.recoverAt = now + 70_000 + 26_000;

  const mkHist = (base: number, spread: number, n: number) =>
    Array.from({ length: n }, (_, i) => ({
      t: now - (n - i) * 1000,
      edge: +(base + seededWave(3.3, i * 1.4) * spread + rand(-0.6, 0.6)).toFixed(1),
      cloud: +(92 + Math.sin(i * 0.35) * 24 + rand(-14, 22)).toFixed(0),
    }));

  const throughputHist = Array.from({ length: 48 }, (_, i) => ({
    t: now - (48 - i) * 1000,
    ingested: Math.round(3400 + seededWave(9.1, i) * 380 + rand(-90, 90)),
    synced: Math.round(3380 + seededWave(9.1, i) * 380 + rand(-90, 90)),
  }));

  const alerts: AlertItem[] = [
    { id: uid++, ts: now - 4_000, sev: 'warning', device: 'ERV-2433', title: 'Torque ripple creeping upward', detail: 'Model vib-anomaly-v3.2 flagged a +9.4% drift vs. 14-day baseline. Bearing inspection recommended within 72h.', score: 61 },
    { id: uid++, ts: now - 19_000, sev: 'info', device: 'ANT-3170', title: 'Firmware 2.4.1 rollout completed', detail: 'Fleet OTA push finished across 8 Antwerp devices. Config hash verified on all nodes.', score: 12 },
    { id: uid++, ts: now - 34_000, sev: 'warning', device: 'ERV-2342', title: 'Line pressure oscillation detected', detail: 'Oscillation energy at 2.1 Hz exceeds band threshold. Check compressor discharge valve.', score: 57 },
    { id: uid++, ts: now - 52_000, sev: 'critical', device: 'ERV-2214', title: 'Bearing spall signature emerging', detail: 'Envelope analysis isolates a 176 Hz characteristic fault frequency. Predicted RUL 11 days.', score: 83 },
    { id: uid++, ts: now - 88_000, sev: 'info', device: 'SITE-B', title: 'Delta sync completed — 0 packet loss', detail: '12,408 buffered packets replayed in 3.1s after the scheduled WAN maintenance window.', score: 8 },
  ];

  const log: LogEntry[] = [
    { id: uid++, ts: now - 1_200, level: 'edge', text: 'INFER vib-anomaly-v3.2 · ERV-2201 → score 0.13 · decision KEEP · 3.9 ms' },
    { id: uid++, ts: now - 2_400, level: 'mqtt', text: 'PUB edge/site-a/erv-2214/vibration → 2.84 mm/s · qos1 · 14 B' },
    { id: uid++, ts: now - 3_100, level: 'cloud', text: 'ACK site-b telemetry batch · 1,182 events · 91 ms round-trip' },
    { id: uid++, ts: now - 4_000, level: 'alert', text: 'WARN score 61 · ERV-2433 torque ripple · ticket AUTO-2214 opened' },
    { id: uid++, ts: now - 5_300, level: 'mqtt', text: 'PUB edge/site-a/erv-2319/power → 418 kW · qos1 · 14 B' },
    { id: uid++, ts: now - 6_800, level: 'edge', text: 'INFER thermal-cam-v1.9 · ERV-2307 → max 68.4°C · decision KEEP · 4.2 ms' },
    { id: uid++, ts: now - 7_900, level: 'cloud', text: 'PG-16 hypertable sync · chunk 2026_10_23_14 · 0 conflicts · 44 ms' },
    { id: uid++, ts: now - 9_500, level: 'mqtt', text: 'PUB edge/site-b/ant-3147/battery → 86.7% · qos0 · 12 B' },
  ];

  return {
    tick: 0,
    upSecs: 0,
    devices,
    alerts,
    log,
    outage: { phase: 'up', remaining: 0, total: 20, queued: 0, drained: 0, lastSync: { drained: 12408, windowMs: 3100, outageSecs: 34 } },
    edgeMs: 4.1,
    cloudMs: 96,
    latencyHist: mkHist(4.1, 1.15, 48),
    throughputHist,
    eps: 3560,
    plantHealth: 94.2,
    totals: {
      events: 341_208_554,
      edgeDecisions: 9_842_310,
      cloudAcks: 128_940,
      anomaliesCaught: 18_204,
      failuresInjected: 312,
      downtimeAvoidedS: 4_102,
      bytesSyncedMB: 8_412_300,
    },
  };
}

class SimEngine {
  state: SimState = buildInitialState();
  private listeners = new Set<() => void>();
  private version = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private startedAt = Date.now();

  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => { this.listeners.delete(l); };
  };
  getVersion = () => this.version;
  private emit() {
    this.version++;
    this.listeners.forEach((l) => l());
  }

  start() {
    const g = globalThis as unknown as { __edgesyncStarted?: boolean };
    if (g.__edgesyncStarted) return;
    g.__edgesyncStarted = true;
    this.timer = setInterval(() => this.tick(), 1000);
  }

  /* ------------ public actions ------------ */

  triggerOutage() {
    if (this.state.outage.phase !== 'up') return;
    const now = Date.now();
    this.state.outage = { ...this.state.outage, phase: 'out', remaining: 20, total: 20, queued: 0, drained: 0 };
    this.pushAlert('critical', 'SITE-A', 'WAN uplink lost — edge takeover engaged', 'Backbone carrier dropped BGP session to eu-central-1. Edge cluster ERV-G2 acquired local control. Telemetry buffering to delta store.', 88);
    this.pushLog('sys', 'SYS WAN uplink DOWN · site-a · carrier eu-central-1 · edge autonomy engaged');
    this.pushLog('edge', 'EDGE local autonomy mode · safety loops armed · actuation continues at 4 ms');
    this.emit();
  }

  restoreOutage() {
    if (this.state.outage.phase !== 'out') return;
    this.state.outage = { ...this.state.outage, remaining: 0 };
  }

  injectFault(deviceId: string) {
    const d = this.state.devices.find((x) => x.id === deviceId);
    if (!d) return;
    const now = Date.now();
    d.failAt = now + 1_500;
    d.recoverAt = now + 24_000;
    this.state.totals = { ...this.state.totals, failuresInjected: this.state.totals.failuresInjected + 1 };
    this.pushLog('sys', `SYS fault injected · ${d.id} · watchdog armed · auto-recovery in ~24s`);
    this.emit();
  }

  clearFault(deviceId: string) {
    const d = this.state.devices.find((x) => x.id === deviceId);
    if (!d || (d.failAt === null && d.recoverAt === null)) return;
    d.failAt = null; d.recoverAt = null; d.health = clamp(d.health + 14, 0, 100);
    this.pushLog('sys', `SYS fault cleared · ${d.id} · heartbeat nominal · quarantine lifted`);
    this.emit();
  }

  ackAlert(id: number) {
    this.state.alerts = this.state.alerts.filter((a) => a.id !== id);
    this.emit();
  }

  /* ------------ internals ------------ */

  private pushLog(level: string, text: string) {
    this.state.log = [{ id: uid++, ts: Date.now(), level, text }, ...this.state.log].slice(0, 46);
  }

  private pushAlert(sev: Severity, device: string, title: string, detail: string, score: number) {
    this.state.alerts = [{ id: uid++, ts: Date.now(), sev, device, title, detail, score }, ...this.state.alerts].slice(0, 26);
    this.state.totals = { ...this.state.totals, anomaliesCaught: this.state.totals.anomaliesCaught + (sev === 'info' ? 0 : 1) };
  }

  private tick() {
    const s = this.state;
    const now = Date.now();
    s.tick += 1;
    s.upSecs = Math.floor((now - this.startedAt) / 1000);

    /* ---- devices: random walk + anomaly bursts ---- */
    for (const d of s.devices) {
      const failed = d.failAt !== null && d.recoverAt !== null && now < d.recoverAt;
      if (d.failAt !== null && now >= d.failAt && d.recoverAt !== null) {
        if (d.status !== 'failed') {
          this.pushAlert('critical', d.id, 'Heartbeat lost — device failure detected', `${d.name} missed 3 consecutive MQTT heartbeats. Edge node quarantined the device and froze its control loops.`, 92);
          this.pushLog('alert', `CRIT heartbeat lost · ${d.id} · quarantine engaged · siblings unaffected`);
        }
      }
      if (d.recoverAt !== null && now >= d.recoverAt) {
        if (d.status === 'failed') {
          this.pushLog('sys', `SYS ${d.id} heartbeat restored · health probe 99/100 · rejoining fleet mesh`);
          this.pushAlert('info', d.id, 'Device rejoining — heartbeat restored', `${d.name} passed 5 consecutive watchdog probes. Delta queue replay in progress.`, 15);
        }
        d.failAt = now + rand(110_000, 190_000);
        d.recoverAt = d.failAt + 26_000;
      }

      if (failed) {
        d.status = 'failed';
        d.anomaly = clamp(d.anomaly + rand(2, 6), 0, 99);
        d.health = clamp(d.health - rand(1.4, 2.6), 30, 100);
        continue;
      }

      // occasional anomaly burst (bearing spall, thermal runaway, …)
      if (d.anomalyTicks > 0) d.anomalyTicks -= 1;
      else if (Math.random() < 0.008) d.anomalyTicks = Math.floor(rand(7, 15));

      const burst = d.anomalyTicks > 0 ? d.spread * 2.1 : 0;
      const pull = (d.base - d.value) * 0.045;
      const shock = (Math.random() - 0.5) * 2 * d.spread * (d.anomalyTicks > 0 ? 0.9 : 0.55);
      d.value = clamp(d.value + pull + shock + (d.anomalyTicks > 0 ? burst * 0.16 : 0), d.base * 0.35, d.critAt * 1.18);
      d.hist = [...d.hist.slice(-47), d.value];

      // anomaly score: z-score-ish, amplified during bursts
      const z = Math.abs(d.value - d.base) / (d.spread * 2.4 + 0.001);
      const target = clamp(z * 46 + (d.anomalyTicks > 0 ? 34 : 0) + rand(-4, 4), 2, 99);
      d.anomaly = clamp(d.anomaly * 0.55 + target * 0.45, 1, 99);

      d.lastDecisionMs = clamp(d.lastDecisionMs + rand(-0.35, 0.35) + (d.anomalyTicks > 0 ? 0.12 : 0), 2.4, 7.8);
      d.health = clamp(d.health + (d.anomaly > 60 ? -rand(0.25, 0.7) : rand(-0.12, 0.22)), 55, 100);
      d.status = deriveStatus(d);

      /* threshold alerts with per-device cooldown */
      if (d.status !== 'online' && now > d.cooldownUntil) {
        d.cooldownUntil = now + 16_000;
        const sev: Severity = d.status === 'critical' ? 'critical' : 'warning';
        this.pushAlert(
          sev, d.id,
          sev === 'critical' ? `Threshold breach — ${d.metric.toLowerCase()} critical` : `Drift warning — ${d.metric.toLowerCase()} elevated`,
          `${d.name} reading ${d.value.toFixed(d.unit === '°C' || d.unit === 'mm/s' ? 1 : 0)} ${d.unit} vs ${d.warnAt} ${d.unit} warn band. Edge model acted in ${d.lastDecisionMs.toFixed(1)} ms; no cloud round-trip required.`,
          Math.round(d.anomaly),
        );
        this.pushLog('alert', `${sev === 'critical' ? 'CRIT' : 'WARN'} score ${Math.round(d.anomaly)} · ${d.id} ${d.metric.toLowerCase()} ${d.value.toFixed(1)} ${d.unit} · edge acted locally`);
      }
    }

    /* ---- outage / delta queue ---- */
    const o = s.outage;
    if (o.phase === 'out') {
      const remaining = o.remaining - 1;
      let queued = o.queued;
      for (const d of s.devices) {
        if (d.site !== 'site-a' || d.status === 'failed') continue;
        const n = Math.random() < 0.5 ? 1 : 2;
        d.queued += n;
        queued += n;
      }
      s.outage = { ...o, remaining, queued };
      if (s.tick % 4 === 0) this.pushLog('sync', `QUEUE delta-store += ${Math.floor(rand(96, 150))} packets · site-a · link down · edge autonomy holding`);
      if (remaining <= 0) {
        s.outage = { ...s.outage, phase: 'restoring', remaining: 0 };
        this.pushLog('sync', 'SYNC WAN restored after 20.0s · negotiating resumption · streaming delta queue');
        this.pushAlert('info', 'SITE-A', 'Uplink restored — delta sync engaged', `Replaying ${s.outage.queued.toLocaleString()} buffered packets to eu-central-1. QoS-1 exactly-once replay, conflict-free merge via vector clocks.`, 18);
      }
    } else if (o.phase === 'restoring') {
      let queued = o.queued;
      let drainedNow = 0;
      const drainRate = Math.max(140, Math.floor(o.queued / 4.5));
      const perDevice = Math.ceil(drainRate / s.devices.filter((d) => d.site === 'site-a').length);
      for (const d of s.devices) {
        if (d.site !== 'site-a') continue;
        const take = Math.min(d.queued, perDevice);
        d.queued -= take;
        queued -= take;
        drainedNow += take;
      }
      const drained = o.drained + drainedNow;
      if (queued <= 0) {
        s.outage = { phase: 'up', remaining: 0, total: o.total, queued: 0, drained: 0, lastSync: { drained, windowMs: 4_300, outageSecs: 20 } };
        for (const d of s.devices) d.queued = 0;
        s.totals = { ...s.totals, downtimeAvoidedS: s.totals.downtimeAvoidedS + 20, bytesSyncedMB: s.totals.bytesSyncedMB + drained * 0.014 };
        this.pushLog('sync', `SYNC delta replay complete · ${drained.toLocaleString()} packets · 0 loss · consistency window 4.3s`);
        this.pushAlert('info', 'SITE-A', 'Fleet consistent again — zero data loss', `${drained.toLocaleString()} packets replayed from edge delta store. PostgreSQL merge: 0 conflicts, 4.3s convergence, full audit trail retained.`, 9);
      } else {
        s.outage = { ...o, queued, drained };
        if (s.tick % 2 === 0) this.pushLog('sync', `SYNC draining… ${queued.toLocaleString()} remaining · ${drainedNow.toLocaleString()}/s · exactly-once replay`);
      }
    }

    /* ---- latency + throughput ---- */
    const congestion = Math.sin(s.tick * 0.21) * 0.5 + 0.5; // 0..1 slow wave
    s.edgeMs = clamp(3.9 + Math.sin(s.tick * 0.5) * 0.5 + rand(-0.5, 0.5), 2.6, 6.2);
    s.cloudMs = clamp(82 + congestion * 46 + rand(-9, 12), 58, 148);
    s.latencyHist = [...s.latencyHist.slice(-89), { t: now, edge: s.edgeMs, cloud: s.cloudMs }];

    const outageDrop = s.outage.phase === 'out' ? 0.44 : 1; // Site B keeps flowing; Site A is severed
    const ingested = Math.round(3560 + seededWave(5.5, s.tick * 0.35) * 260 + rand(-70, 70));
    const synced = s.outage.phase === 'restoring' ? Math.round(ingested + 420) : Math.round(ingested * outageDrop);
    s.eps = ingested;
    s.throughputHist = [...s.throughputHist.slice(-59), { t: now, ingested, synced: Math.max(synced, 900) }];

    s.totals = {
      ...s.totals,
      events: s.totals.events + ingested,
      edgeDecisions: s.totals.edgeDecisions + Math.round(ingested * 0.62),
      cloudAcks: s.totals.cloudAcks + (s.outage.phase === 'out' ? Math.round(ingested * 0.09) : Math.round(ingested / 28)),
    };

    /* ---- console chatter ---- */
    const chatter = Math.floor(rand(2, 4));
    for (let i = 0; i < chatter; i++) {
      const d = s.devices[Math.floor(Math.random() * s.devices.length)];
      const r = Math.random();
      if (r < 0.36) {
        this.pushLog('mqtt', `PUB edge/${d.site === 'site-a' ? 'site-a' : 'site-b'}/${d.id.toLowerCase()}/${d.metric.toLowerCase().replace(' ', '_')} → ${d.value.toFixed(1)} ${d.unit} · qos1 · 14 B`);
      } else if (r < 0.68) {
        this.pushLog('edge', `INFER vib-anomaly-v3.2 · ${d.id} → score ${(d.anomaly / 100).toFixed(2)} · ${d.anomaly > 60 ? 'ACTUATE' : 'KEEP'} · ${d.lastDecisionMs.toFixed(1)} ms`);
      } else if (s.outage.phase === 'out') {
        this.pushLog('sync', `QUEUE heartbeat buffered · site-a · ${s.outage.queued.toLocaleString()} packets held in delta store`);
      } else {
        this.pushLog('cloud', `ACK batch site-${d.site === 'site-a' ? 'a' : 'b'} · ${Math.round(rand(150, 320))} events · ${Math.round(rand(72, 118))} ms round-trip`);
      }
    }

    /* ---- plant health ---- */
    const alive = s.devices;
    s.plantHealth = clamp(alive.reduce((acc, d) => acc + d.health, 0) / alive.length, 0, 100);

    this.emit();
  }
}

export const engine = new SimEngine();
engine.start();

export function useSim(): SimState {
  useSyncExternalStore(engine.subscribe, engine.getVersion);
  return engine.state;
}
