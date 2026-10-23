import { useMemo, useState } from 'react';
import {
  Boxes, Braces, CheckCircle2, Cpu, Database, FileCode2, Flame, GitBranch,
  Layers, MessageSquareDot, Radio, ServerCog, Snowflake, Workflow, Container, CircleDot,
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { GOLD, VIOL_SOFT } from '../lib/viz';

const STACK = [
  { icon: Boxes, layer: 'Experience', name: 'React 19 + Vite', detail: 'This console. Streaming telemetry over WebSocket fan-out, 60 fps charts, optimistic acks.', color: GOLD },
  { icon: ServerCog, layer: 'Gateway', name: 'Node.js 22 · Fastify', detail: 'EdgeSync Ingest — TLS-terminated MQTT bridge, delta-replay coordinator, REST & WS edge.', color: GOLD },
  { icon: Cpu, layer: 'Intelligence', name: 'Python 3.12 · ONNX', detail: 'vib-anomaly-v3.2 gradient-boosted detector + isolation forest, served in-process at the edge.', color: VIOL_SOFT },
  { icon: Radio, layer: 'Messaging', name: 'MQTT 5.0 · EMQX', detail: 'QoS-1 exactly-once. Topic ACL per site, retained LWT heartbeats, 3-broker cluster.', color: VIOL_SOFT },
  { icon: Database, layer: 'Persistence', name: 'PostgreSQL 16 + TimescaleDB', detail: 'Hypertables partitioned by time + site, continuous aggregates for the BI layer, 41 GB hot heap.', color: GOLD },
  { icon: Snowflake, layer: 'Columnar', name: 'Parquet cold storage', detail: 'Every event, every millisecond — zstd-columnar archive in object storage after 90 days.', color: VIOL_SOFT },
  { icon: Workflow, layer: 'Orchestration', name: 'Kubernetes + K3s', detail: 'Same manifest ships cloud and edge. GitOps via Argo; edge runs K3s on fanless gateways.', color: GOLD },
  { icon: GitBranch, layer: 'Delivery', name: 'OTA + signed images', detail: 'Signed edge bundles (cosign), staged ring rollouts, automatic rollback on watchdog bite.', color: VIOL_SOFT },
];

const CODE: Record<string, string[]> = {
  sql: [
    `CREATE TABLE telemetry (`,
    `  device_id    TEXT      NOT NULL,`,
    `  metric       TEXT      NOT NULL,`,
    `  value        DOUBLE PRECISION NOT NULL,`,
    `  anomaly      SMALLINT  NOT NULL DEFAULT 0,`,
    `  edge_ms      REAL      NOT NULL,`,
    `  ts           TIMESTAMPTZ NOT NULL`,
    `);`,
    ``,
    `-- time-series superpowers: partitioned hypertable`,
    `SELECT create_hypertable('telemetry', 'ts',`,
    `  chunk_time_interval => interval '1 day');`,
    ``,
    `-- materialized hourly aggregates for the BI plane`,
    `CREATE MATERIALIZED VIEW telemetry_hourly WITH`,
    `  (timescaledb.continuous) AS`,
    `SELECT device_id, metric,`,
    `       time_bucket('1 hour', ts) AS bucket,`,
    `       avg(value) AS avg_v, max(value) AS max_v,`,
    `       count(*) FILTER (WHERE anomaly >= 60) AS hot_events`,
    `FROM telemetry GROUP BY 1, 2, 3;`,
    ``,
    `-- exactly-once delta replay merges here; vector clocks`,
    `-- guarantee conflict-free upserts after outage windows.`,
  ],
  py: [
    `from edgesync_runtime import onnx_session, delta_store`,
    `import numpy as np`,
    ``,
    `# vib-anomaly-v3.2 — isolation forest + gradient boosting`,
    `sess = onnx_session('/models/vib_anomaly_v3_2.onnx',`,
    `                    fp16=True)`,
    ``,
    `def on_reading(pkg: Reading):`,
    `    feats = np.array([[pkg.rms, pkg.crest, pkg.kurtosis,`,
    `                       pkg.band_176hz, pkg.spectral_entropy]],`,
    `                     np.float16)`,
    `    score = sess.run(['anomaly_score'],`,
    `                     {'x': feats})[0][0]`,
    ``,
    `    if score >= 0.78:                  # critical`,
    `        cut_feed(pkg.device_id)         # hard local stop`,
    `        delta_store.push(pkg, score, 'ACTUATE')`,
    `    elif score >= 0.55:`,
    `        throttle(pkg.device_id, pct=60) # derate to 60%`,
    `    else:`,
    `        delta_store.push(pkg, score, 'KEEP')`,
    ``,
    `# when the WAN drops, everything above keeps running —`,
    `# delta_store replays to PostgreSQL exactly once on restore.`,
  ],
  ts: [
    `import { fastify } from 'fastify';`,
    `import mqtt from 'mqtt';`,
    ``,
    `// Node.js ingest — MQTT <-> PostgreSQL bridge + replay`,
    `const app = fastify({ logger: false });`,
    `const broker = mqtt.connect('mqtts://emqx.internal:8883', {`,
    `  clientId: 'ingest-01', protocolVersion: 5,`,
    `  properties: { sessionExpiryInterval: 0 },`,
    `  qos: 1,`,
    `});`,
    ``,
    `broker.subscribe('edge/+/+/telemetry', { qos: 1 });`,
    ``,
    `broker.on('message', async (topic, payload) => {`,
    `  const evt = decode(payload);     // 14-byte protobuf`,
    `  await pool.query(`,
    `    'INSERT INTO telemetry VALUES ($1,$2,$3,$4,$5,$6)',`,
    `    [evt.device, evt.metric, evt.value,`,
    `     evt.anomaly, evt.edge_ms, evt.ts]`,
    `  );`,
    `  ws.broadcast(evt);             // -> every open console`,
    `});`,
  ],
};

const KEYWORDS = new Set('CREATE TABLE SELECT FROM GROUP BY WHERE INSERT INTO VALUES WITH MATERIALIZED VIEW AS INTERVAL FILTER COUNT AVG MAX TIMESTAMP timestamptz double precision smallint real text not null default unique index primary key hypertable if exists using order limit desc asc join on and or case when then else end cast interval'.split(' ').map(s => s.toUpperCase()));
const PY_KW = new Set(['from', 'import', 'def', 'if', 'elif', 'else', 'return', 'as', 'in', 'for', 'while', 'with', 'None', 'True', 'False', 'and', 'or', 'not', 'is']);
const TS_KW = new Set(['import', 'from', 'const', 'let', 'await', 'async', 'function', 'return', 'new', 'if', 'else', 'true', 'false', 'typeof', 'export', 'default', 'as']);

function highlight(line: string, lang: string) {
  // token regex: strings, comments, numbers, words
  const re = /('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|(--[^\n]*|\/\/[^\n]*|#[^\n]*)|\b(\d+(?:\.\d+)?)\b|([A-Za-z_$][\w$]*)/g;
  const out: { text: string; cls: string | null }[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push({ text: line.slice(last, m.index), cls: null });
    const [full, str, comment, num, word] = m;
    if (str) out.push({ text: full, cls: 'text-[#f4c64a]' });
    else if (comment) out.push({ text: full, cls: 'text-[#5f557e] italic' });
    else if (num) out.push({ text: full, cls: 'text-[#fda4af]' });
    else if (word) {
      const w = lang === 'sql' ? word.toUpperCase() : word;
      const set = lang === 'sql' ? KEYWORDS : lang === 'py' ? PY_KW : TS_KW;
      if (set.has(w) || (lang !== 'sql' && set.has(word))) out.push({ text: full, cls: 'text-[#a78bfa]' });
      else if (lang === 'py' && (word === 'np' || word === 'self')) out.push({ text: full, cls: 'text-[#7dd3fc]' });
      else if (/^[a-z_][\w$]*$/.test(word) && line[re.lastIndex] === '(') out.push({ text: full, cls: 'text-[#7dd3fc]' });
      else out.push({ text: full, cls: 'text-[#d7d0ec]' });
    }
    last = re.lastIndex;
  }
  if (last < line.length) out.push({ text: line.slice(last), cls: null });
  return out;
}

function CodeBlock({ lang }: { lang: string }) {
  const lines = CODE[lang];
  const rendered = useMemo(() => lines.map((l) => highlight(l, lang)), [lines, lang]);
  return (
    <pre className="font-mono text-[10.5px] leading-[1.78]">
      {rendered.map((tokens, i) => (
        <div key={i} className="flex">
          <span className="w-7 shrink-0 select-none text-right text-[#3c3457] tabular">{i + 1}</span>
          <span className="pl-4 whitespace-pre">{tokens.length === 0 ? ' ' : tokens.map((t, j) => <span key={j} className={t.cls ?? 'text-[#d7d0ec]'}>{t.text}</span>)}</span>
        </div>
      ))}
    </pre>
  );
}

const TABS = [
  { id: 'sql', label: 'schema.sql', icon: Database },
  { id: 'py', label: 'anomaly_edge.py', icon: FileCode2 },
  { id: 'ts', label: 'ingest.ts', icon: Braces },
];

const API = [
  ['GET', '/v1/devices', 'List fleet with live status, health and anomaly score'],
  ['GET', '/v1/devices/:id/telemetry', 'Time-ranged metric series · window=1h|24h|7d'],
  ['GET', '/v1/decisions', 'Edge decision audit trail · filter by model & outcome'],
  ['POST', '/v1/outage/simulate', 'Inject WAN severance · scope=site-a|site-b · duration=Ns'],
  ['GET', '/v1/alerts', 'Severity-filtered anomaly feed · ack via POST /v1/alerts/:id/ack'],
  ['GET', '/v1/analytics/percentiles', 'P50/P90/P95/P99 edge vs cloud decision latency'],
  ['WS', '/v1/stream', 'Live telemetry + decision + sync fan-out channel'],
];

export default function Architecture() {
  const [tab, setTab] = useState('sql');
  const toast = useToast();

  return (
    <div className="relative mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10" id="top">
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/4 h-[30rem] w-[42rem] rounded-full bg-viol/10 blur-[170px]" />

      <div className="relative mb-8">
        <span className="eyebrow">Architecture · how it actually works</span>
        <h1 className="font-display mt-2 max-w-3xl text-5xl font-black leading-[1.02] tracking-tight text-cream">Two planes.<br /><span className="gold-text">One nervous system.</span></h1>
        <p className="mt-3 max-w-lg text-[13px] leading-relaxed text-[#a99dd0]">A hot path that refuses to wait for the cloud, and a cold path that never forgets. Every component below is in production on the Antwerp pilot today.</p>
      </div>

      {/* ===== Hero figure ===== */}
      <div className="relative mb-10 grid gap-5 xl:grid-cols-12">
        <div className="panel noise relative overflow-hidden xl:col-span-7">
          <img src="/img/iso-arch.png" alt="Isometric render of an EdgeSync edge cluster synchronising with a cloud core over fiber" className="h-full min-h-[340px] w-full object-cover" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0d0a17] via-[#0d0a17]/25 to-transparent" />
          <div className="absolute bottom-4 left-5 right-5">
            <div className="font-mono text-[8px] uppercase tracking-[0.28em] text-gold">Fig. 01 — The EdgeSync topology</div>
            <p className="mt-1 max-w-md text-[11px] leading-snug text-[#d7d0ec]">Fanless gateways run full autonomy at Erpe-Mere and Antwerp North. The cloud plane holds the long memory — and the long view.</p>
          </div>
        </div>
        <div className="flex flex-col gap-4 xl:col-span-5">
          {[
            { n: '01', t: 'Decide at the edge', d: 'ONNX inference in-process on the gateway. 3.9 ms P50 from sensor transition to actuation — 24× faster than any WAN round-trip.' },
            { n: '02', t: 'Queue, never lose', d: 'When the uplink drops, every event lands in an NVRAM-backed delta store. QoS-1 + vector clocks make replay exactly-once and conflict-free.' },
            { n: '03', t: 'Converge in the cloud', d: 'TimescaleDB hypertables + continuous aggregates turn raw events into plant-wide intelligence — without ever throttling the hot path.' },
          ].map((s) => (
            <div key={s.n} className="panel noise panel-hover flex flex-1 items-start gap-4 p-5">
              <span className="font-display text-3xl font-black text-viol/60">{s.n}</span>
              <div>
                <div className="text-[13px] font-extrabold text-cream">{s.t}</div>
                <p className="mt-1 text-[10.5px] leading-relaxed text-[#a99dd0]">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Stack ===== */}
      <div id="stack" className="relative mb-10 scroll-mt-24">
        <div className="mb-5 flex items-center gap-3">
          <Layers size={16} className="text-gold" />
          <h2 className="font-display text-2xl font-bold text-cream">The stack, layer by layer</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STACK.map(({ icon: I, layer, name, detail, color }) => (
            <div key={name} className="panel noise panel-hover group p-5">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line2 bg-panel2 transition-transform duration-300 group-hover:-translate-y-0.5" style={{ color }}><I size={18} strokeWidth={1.6} /></span>
                <span className="font-mono text-[8px] uppercase tracking-[0.26em] text-[#6f658f]">{layer}</span>
              </div>
              <div className="mt-3 text-[13px] font-extrabold leading-snug text-cream">{name}</div>
              <p className="mt-1.5 text-[9.5px] leading-relaxed text-[#a99dd0]">{detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Code + API ===== */}
      <div id="api" className="relative grid scroll-mt-24 gap-5 xl:grid-cols-12">
        <div className="panel noise overflow-hidden xl:col-span-7">
          <div className="flex items-center justify-between gap-2 border-b border-line bg-[#0b0817] px-4 pt-3">
            <div className="flex gap-1 overflow-x-auto">
              {TABS.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)} className={`flex shrink-0 items-center gap-1.5 rounded-t-lg border-b-2 px-3.5 py-2 font-mono text-[9.5px] transition-colors ${tab === t.id ? 'border-gold bg-panel2 text-gold' : 'border-transparent text-[#8d84ad] hover:text-cream'}`}>
                  <t.icon size={11} />{t.label}
                </button>
              ))}
            </div>
            <button onClick={() => { void navigator.clipboard?.writeText(CODE[tab].join('\n')).catch(() => {}); toast('Snippet copied', `${TABS.find(t => t.id === tab)?.label} copied to clipboard.`); }} className="mb-1 shrink-0 font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#6f658f] transition-colors hover:text-gold">Copy</button>
          </div>
          <div className="console-scroll overflow-x-auto bg-[#0b0817] p-5">
            <CodeBlock lang={tab} />
          </div>
        </div>

        <div className="flex flex-col gap-4 xl:col-span-5">
          <div className="panel noise flex-1 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><MessageSquareDot size={14} className="text-gold" /><h3 className="font-display text-lg font-bold text-cream">API surface</h3></div>
              <span className="chip">REST + WS · v1.4</span>
            </div>
            <ul className="mt-4 divide-y divide-line">
              {API.map(([m, path, desc]) => (
                <li key={path} className="flex items-start gap-3 py-2.5">
                  <span className={`mt-0.5 w-9 shrink-0 rounded-md border px-1.5 py-0.5 text-center font-mono text-[8px] font-bold ${m === 'GET' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : m === 'WS' ? 'border-viol/40 bg-viol/10 text-violsoft' : 'border-gold/30 bg-gold/10 text-gold'}`}>{m}</span>
                  <span className="min-w-0">
                    <code className="block font-mono text-[9px] text-[#d7d0ec]">{path}</code>
                    <span className="mt-0.5 block text-[8.5px] leading-snug text-[#8d84ad]">{desc}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="panel noise flex items-center justify-between gap-4 p-5" style={{ borderColor: 'rgba(244,198,74,0.25)' }}>
            <div className="flex items-center gap-3">
              <Container size={20} className="shrink-0 text-gold" strokeWidth={1.5} />
              <div>
                <div className="text-[11px] font-bold text-cream">One binary, both worlds</div>
                <div className="text-[9px] text-[#a99dd0]">The same K3s manifest deploys to the cloud or to a fanless gateway.</div>
              </div>
            </div>
            <code className="whitespace-nowrap rounded-lg border border-line2 bg-panel2 px-2.5 py-1.5 font-mono text-[8.5px] text-gold">helm install edgesync</code>
          </div>
        </div>
      </div>

      {/* ===== Build proof strip ===== */}
      <div className="relative mt-10 grid grid-cols-2 gap-3 border-t border-line pt-8 sm:grid-cols-4">
        {[
          { icon: Flame, k: '24×', v: 'P50 decision-latency advantage vs. cloud round-trip' },
          { icon: CheckCircle2, k: '0', v: 'events lost across 31 simulated outages and counting' },
          { icon: CircleDot, k: '3', v: 'brokers, 2 sites, 18 devices — all streaming right now' },
          { icon: Workflow, k: '4.3 s', v: 'median steady-state convergence after link restore' },
        ].map(({ icon: I, k, v }) => (
          <div key={k} className="flex items-start gap-3">
            <I size={15} className="mt-1 shrink-0 text-violsoft" />
            <div>
              <div className="font-display text-2xl font-black text-cream">{k}</div>
              <p className="mt-0.5 text-[9px] leading-snug text-[#8d84ad]">{v}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
