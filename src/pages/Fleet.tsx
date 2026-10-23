import { useMemo, useState } from 'react';
import {
  ArrowDownUp, Cpu, Download, Search, X, MapPin, Calendar, MemoryStick, Thermometer,
  Activity, Zap, Wrench, FileCheck2, Wifi,
} from 'lucide-react';
import { useSim, type DeviceSim, type DeviceStatus } from '../lib/engine';
import { Sparkline, GOLD, VIOL_SOFT, RED, GREEN } from '../lib/viz';
import { useToast } from '../components/Toast';

type SortKey = 'id' | 'value' | 'anomaly' | 'health' | 'status';

const statusOrder: Record<DeviceStatus, number> = { failed: 0, critical: 1, warning: 2, online: 3 };

export default function Fleet() {
  const sim = useSim();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [site, setSite] = useState<'all' | 'site-a' | 'site-b'>('all');
  const [status, setStatus] = useState<'all' | DeviceStatus>('all');
  const [sort, setSort] = useState<SortKey>('status');
  const [dir, setDir] = useState<1 | -1>(1);
  const [selected, setSelected] = useState<DeviceSim | null>(null);

  const filtered = useMemo(() => {
    let list = sim.devices.filter((d) => {
      if (site !== 'all' && d.site !== site) return false;
      if (status !== 'all' && d.status !== status) return false;
      if (query) {
        const q = query.toLowerCase();
        return [d.id, d.name, d.kind, d.metric].some((f) => f.toLowerCase().includes(q));
      }
      return true;
    });
    const m = dir;
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'id': return a.id.localeCompare(b.id) * m;
        case 'value': return (a.value - b.value) * m;
        case 'anomaly': return (a.anomaly - b.anomaly) * m;
        case 'health': return (a.health - b.health) * m;
        case 'status': return (statusOrder[a.status] - statusOrder[b.status]) * m;
      }
    });
    return list;
  }, [sim.devices, query, site, status, sort, dir]);

  const exportCsv = () => {
    const header = 'device_id,name,kind,site,metric,value,unit,anomaly_score,health_pct,status,edge_infer_ms';
    const rows = filtered.map((d) => [d.id, `"${d.name}"`, `"${d.kind}"`, d.site, d.metric, d.value.toFixed(2), d.unit, Math.round(d.anomaly), d.health.toFixed(1), d.status, d.lastDecisionMs.toFixed(1)].join(','));
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'edgesync-fleet-export.csv'; a.click();
    URL.revokeObjectURL(url);
    toast('Fleet export ready', `${filtered.length} device records written to CSV.`);
  };

  const th = (key: SortKey, label: string) => (
    <th className="px-4 py-2.5 text-left">
      <button onClick={() => { if (sort === key) setDir((d) => (d === 1 ? -1 : 1)); else { setSort(key); setDir(1); } }} className="inline-flex items-center gap-1 font-mono text-[8.5px] font-bold uppercase tracking-[0.2em] text-[#8d84ad] transition-colors hover:text-gold">
        {label} <ArrowDownUp size={9} className={sort === key ? 'text-gold' : 'opacity-40'} />
      </button>
    </th>
  );

  return (
    <div className="relative mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10">
      <div aria-hidden className="pointer-events-none absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-gold/6 blur-[150px]" />

      <div className="relative mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Fleet Registry · 18 nodes</span>
          <h1 className="font-display mt-2 text-4xl font-black tracking-tight text-cream">Device <span className="gold-text">Fleet</span></h1>
          <p className="mt-1.5 max-w-md text-[12px] leading-relaxed text-[#a99dd0]">Every gateway, pod and sensor — searchable, sortable, and honest about its health. Click any row for the full dossier.</p>
        </div>
        <button className="btn-ghost !py-2 text-[11px]" onClick={exportCsv}><Download size={13} /> Export CSV ({filtered.length})</button>
      </div>

      {/* Controls */}
      <div className="relative mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6f658f]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search devices, kinds, metrics…" className="w-full rounded-xl border border-line2 bg-panel2 py-2.5 pl-10 pr-4 text-[12px] text-cream placeholder-[#6f658f] outline-none transition-colors focus:border-gold/50" aria-label="Search fleet" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-line2 p-1">
            {([['all', 'All sites'], ['site-a', 'Site A'], ['site-b', 'Site B']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setSite(k)} className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${site === k ? 'bg-gold text-[#231a05]' : 'text-[#b9b0d6] hover:text-cream'}`}>{l}</button>
            ))}
          </div>
          <div className="flex rounded-xl border border-line2 p-1">
            {([['all', 'Any state'], ['online', 'Online'], ['warning', 'Warning'], ['critical', 'Critical'], ['failed', 'Failed']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setStatus(k as 'all' | DeviceStatus)} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-all ${status === k ? 'bg-viol/30 text-violsoft' : 'text-[#8d84ad] hover:text-cream'}`}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="relative overflow-x-auto rounded-2xl border border-line2 bg-panel">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line2 bg-[#100c20]">
              {th('id', 'Device')}
              <th className="px-4 py-2.5"><span className="font-mono text-[8.5px] font-bold uppercase tracking-[0.2em] text-[#8d84ad]">Reading</span></th>
              {th('value', 'Value')}
              {th('anomaly', 'Anomaly')}
              {th('health', 'Health')}
              <th className="px-4 py-2.5"><span className="font-mono text-[8.5px] font-bold uppercase tracking-[0.2em] text-[#8d84ad]">Trend 48s</span></th>
              {th('status', 'State')}
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => {
              const failed = d.status === 'failed';
              const color = failed ? RED : d.status === 'critical' ? RED : d.status === 'warning' ? GOLD : d.site === 'site-a' ? GOLD : VIOL_SOFT;
              return (
                <tr key={d.id} onClick={() => setSelected(d)} className="cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-viol/6">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${failed ? 'border-red-500/40 bg-red-500/10 text-red-400' : 'border-line2 bg-panel2 text-violsoft'}`}><Cpu size={14} /></span>
                      <div>
                        <div className="font-mono text-[11px] font-bold text-cream">{d.id}</div>
                        <div className="text-[9px] text-[#8d84ad]">{d.kind} · {d.site === 'site-a' ? 'Site A' : 'Site B'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[10px] text-[#b9b0d6]">{d.metric}</td>
                  <td className="px-4 py-3 font-mono text-[11.5px] font-semibold text-cream tabular">{failed ? '——' : `${d.value.toFixed(1)} ${d.unit}`}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#221c38]">
                        <div className="h-full rounded-full" style={{ width: `${d.anomaly}%`, background: d.anomaly > 60 ? '#f87171' : d.anomaly > 40 ? '#f4c64a' : '#34d399' }} />
                      </div>
                      <span className="font-mono text-[9.5px] text-[#a99dd0] tabular">{Math.round(d.anomaly)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[10.5px] text-[#c9c2e0] tabular">{d.health.toFixed(0)}%</td>
                  <td className="px-4 py-3"><Sparkline data={d.hist.slice(-40)} color={color} width={110} height={32} filled={false} /></td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 font-mono text-[8px] font-bold uppercase tracking-[0.18em] ${d.status === 'online' ? 'text-emerald-300' : d.status === 'warning' ? 'text-gold' : 'text-red-400'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${d.status === 'online' ? 'bg-emerald-400' : d.status === 'warning' ? 'bg-gold' : 'bg-red-500'}`} />{d.status}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-[12px] text-[#8d84ad]">No devices match “{query}”. <button className="text-gold underline" onClick={() => setQuery('')}>Reset search</button></td></tr>}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      {selected && (
        <>
          <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <aside className="fixed right-0 top-0 z-[80] flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-line2 bg-[#100c1f] shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold"><Cpu size={17} /></span>
                <div>
                  <div className="font-mono text-sm font-bold text-cream">{selected.id}</div>
                  <div className="text-[10px] text-[#8d84ad]">{selected.name}</div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg border border-line2 p-2 text-[#a99dd0] transition-colors hover:text-cream" aria-label="Close"><X size={16} /></button>
            </div>
            <div className="flex-1 p-6">
              <div className="rounded-2xl border border-line2 bg-panel2 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#8d84ad]">{selected.metric}</span>
                  <span className="font-mono text-[9px] text-emerald-300">LIVE</span>
                </div>
                <div className="font-display mt-1 text-4xl font-bold text-cream tabular">{selected.status === 'failed' ? '——' : selected.value.toFixed(1)}<span className="ml-2 text-base font-normal text-[#8d84ad]">{selected.unit}</span></div>
                <div className="mt-3"><Sparkline data={selected.hist} color={selected.status === 'online' ? GOLD : RED} width={360} height={72} /></div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  { icon: MapPin, k: 'Site', v: selected.site === 'site-a' ? 'Site A · Erpe-Mere' : 'Site B · Antwerp North' },
                  { icon: Calendar, k: 'Commissioned', v: selected.site === 'site-a' ? '2023-04-18' : '2024-09-02' },
                  { icon: MemoryStick, k: 'Firmware', v: 'v2.4.1 · signed OTA' },
                  { icon: Thermometer, k: 'Enclosure temp', v: `${(34 + (selected.anomaly % 14)).toFixed(1)} °C · nominal` },
                  { icon: Activity, k: 'Edge inference', v: `${selected.lastDecisionMs.toFixed(1)} ms · FP16` },
                  { icon: Wifi, k: 'Uplink', v: selected.site === 'site-a' ? 'LTE-M + fiber fallback' : 'Wi-Fi 6 + fiber' },
                ].map(({ icon: I, k, v }) => (
                  <div key={k} className="rounded-xl border border-line bg-panel p-3">
                    <div className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.2em] text-[#8d84ad]"><I size={10} />{k}</div>
                    <div className="mt-1.5 text-[11px] font-semibold leading-snug text-cream">{v}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-line bg-panel p-4">
                <div className="flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.2em] text-[#8d84ad]"><span>Remaining useful life</span><span className="text-gold">{Math.max(3, Math.round(selected.health / 7.4))} DAYS</span></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#221c38]"><div className="h-full rounded-full bg-gradient-to-r from-viol via-violsoft to-gold" style={{ width: `${Math.min(100, selected.health)}%` }} /></div>
                <p className="mt-2 text-[9.5px] leading-snug text-[#8d84ad]">Survival estimate from a Weibull mixture fitted on 18 months of fleet telemetry. Confidence 84%.</p>
              </div>

              <div className="mt-4">
                <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#8d84ad]">Recent maintenance</div>
                <ul className="mt-2 space-y-1.5 text-[10.5px]">
                  {[
                    ['2026-10-11', 'Bearing inspection — grease replenished, backlash in spec', 'ticket #4821'],
                    ['2026-08-27', 'Firmware 2.4.1 OTA — verified after watchdog reboot', 'ticket #4532'],
                    ['2026-06-30', 'Quarterly calibration vs. reference laser tachometer', 'ticket #4290'],
                  ].map(([d, t, id]) => (
                    <li key={id} className="flex items-start gap-2.5 rounded-lg border border-line bg-panel px-3 py-2">
                      <Wrench size={11} className="mt-0.5 shrink-0 text-violsoft" />
                      <span className="text-[#c9c2e0]"><span className="font-mono text-[9.5px] text-[#8d84ad]">{d}</span> · {t}<span className="mt-0.5 block font-mono text-[8.5px] text-[#6f658f]">{id}</span></span>
                    </li>
                  ))}
                </ul>
              </div>

              <button className="btn-gold mt-5 w-full justify-center" onClick={() => toast('Work order drafted', `Maintenance ticket AUTO-${Math.floor(1000 + Math.random() * 9000)} opened for ${selected.id} · routed to Erpe-Mere shift lead.`)}><FileCheck2 size={14} /> Draft maintenance work order</button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
