import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowRight, ChevronDown, Menu, X, Zap, Activity, Bell } from 'lucide-react';
import { Logo, LivePill, useToast } from './Toast';
import { useSim } from '../lib/engine';
import { fmtCompact } from '../lib/viz';

const NAV = [
  { to: '/', label: 'Platform' },
  { to: '/console', label: 'Console' },
  { to: '/fleet', label: 'Fleet' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/outage', label: 'Outage Lab' },
  { to: '/architecture', label: 'Architecture' },
];

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const toast = useToast();
  const sim = useSim();
  const now = useClock();

  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [location.pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const criticalAlerts = sim.alerts.filter((a) => a.sev === 'critical').length;

  return (
    <div className="relative min-h-screen bg-ink">
      {/* ===== Telemetry ticker ===== */}
      <div className="relative z-[60] flex h-9 items-center overflow-hidden border-b border-line bg-[#0a0714]">
        <div className="pointer-events-none absolute left-0 z-10 flex h-full items-center gap-2 border-r border-line bg-[#0a0714] pl-4 pr-4">
          <span className="h-1.5 w-1.5 rounded-full bg-gold pulse-dot" style={{ animationDuration: '1.6s' }} />
          <span className="font-mono text-[8.5px] font-bold uppercase tracking-[0.24em] text-gold">Live Wire</span>
        </div>
        <div className="animate-marquee flex whitespace-nowrap pl-36">
          {[0, 1].map((copy) => (
            <span key={copy} className="flex items-center" aria-hidden={copy === 1}>
              {[
                `FLEET ${sim.eps.toLocaleString()} EPS INGESTED`,
                `EDGE DECISION P50 ${sim.edgeMs.toFixed(1)} MS`,
                `CLOUD ROUND-TRIP ${sim.cloudMs.toFixed(0)} MS`,
                `${fmtCompact(sim.totals.events)} EVENTS SYNCED · 0 LOSS`,
                `PLANT HEALTH ${sim.plantHealth.toFixed(1)}%`,
                `MQTT CLUSTER 3/3 BROKERS NOMINAL`,
                `POSTGRES 16 · 41 GB HEAP · 0 CONFLICTS`,
                `ANOMALY MODEL vib-anomaly-v3.2 · F1 0.982`,
              ].map((item, i) => (
                <span key={i} className="mx-7 font-mono text-[9px] tracking-[0.14em] text-[#8d84ad]">
                  <span className="mr-2 text-violsoft">◆</span>{item}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ===== Main nav ===== */}
      <header className={`sticky top-0 z-50 border-b transition-all duration-500 ${scrolled ? 'border-line2 bg-[#0a0714]/85 backdrop-blur-2xl' : 'border-transparent bg-transparent'}`}>
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-6 px-4 sm:px-6 lg:px-10">
          <Logo />
          <nav className="ml-2 hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `rounded-lg px-3.5 py-2 text-[12px] font-semibold transition-all duration-200 ${isActive ? 'bg-viol/15 text-violsoft shadow-[inset_0_0_0_1px_rgba(139,92,246,0.35)]' : 'text-[#b9b0d6] hover:bg-panel2 hover:text-cream'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2.5">
            <LivePill />
            <span className="hidden font-mono text-[10px] tabular text-[#8d84ad] xl:block">{now.toLocaleTimeString('en-GB')} UTC+1</span>
            <Link to="/console" className="relative hidden h-9 w-9 items-center justify-center rounded-lg border border-line2 text-[#b9b0d6] transition-colors hover:text-gold md:flex" aria-label="Alerts">
              <Bell size={15} />
              {criticalAlerts > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 font-mono text-[8px] font-bold text-white">{criticalAlerts}</span>}
            </Link>
            <button className="btn-gold hidden !px-4 !py-2 text-[11px] md:inline-flex" onClick={() => toast('Demo environment provisioning…', 'A dedicated tenant is being created in eu-central-1. Check your inbox for the invite link.')}>
              Deploy Edge Node <ArrowRight size={13} />
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-line2 text-cream lg:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu">
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {/* Mobile menu */}
        {open && (
          <div className="border-t border-line2 bg-[#0d0a17]/97 backdrop-blur-2xl lg:hidden">
            <div className="space-y-1 px-4 py-4">
              {NAV.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `block rounded-lg px-4 py-2.5 text-sm font-semibold ${isActive ? 'bg-viol/15 text-violsoft' : 'text-[#c9c2e0]'}`}>
                  {item.label}
                </NavLink>
              ))}
              <button className="btn-gold mt-3 w-full justify-center" onClick={() => toast('Demo environment provisioning…', 'Tenant spinning up in eu-central-1.')}>Deploy Edge Node <ArrowRight size={14} /></button>
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10">
        <Outlet />
      </main>

      {/* ===== Footer ===== */}
      <footer className="relative border-t border-line2 bg-[#080611]">
        <div className="divider-fade" />
        <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-10">
          <div className="grid gap-10 md:grid-cols-12">
            <div className="md:col-span-4">
              <Logo />
              <p className="mt-4 max-w-xs text-[12px] leading-relaxed text-[#a99dd0]">
                The edge-to-cloud intelligence plane for industrial fleets. Urgent decisions in milliseconds at the machine,
                complete truth in the cloud — and zero data loss when the link goes dark.
              </p>
              <div className="mt-5 flex items-center gap-2">
                <span className="chip !text-emerald-300" style={{ borderColor: 'rgba(52,211,153,0.3)' }}><Zap size={10} /> 99.997% uptime · trailing 12 mo</span>
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#8d84ad]">Platform</div>
              <ul className="mt-3 space-y-2 text-[12px] text-[#c9c2e0]">
                <li><Link to="/console" className="hover:text-gold">Live Console</Link></li>
                <li><Link to="/fleet" className="hover:text-gold">Device Fleet</Link></li>
                <li><Link to="/analytics" className="hover:text-gold">Analytics</Link></li>
                <li><Link to="/outage" className="hover:text-gold">Outage Lab</Link></li>
              </ul>
            </div>
            <div className="md:col-span-2">
              <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#8d84ad]">Company</div>
              <ul className="mt-3 space-y-2 text-[12px] text-[#c9c2e0]">
                <li><Link to="/architecture" className="hover:text-gold">Architecture</Link></li>
                <li><Link to="/architecture#stack" className="hover:text-gold">Tech Stack</Link></li>
                <li><Link to="/architecture#api" className="hover:text-gold">API Reference</Link></li>
              </ul>
            </div>
            <div className="md:col-span-4">
              <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#8d84ad]">Mission Control Bulletin</div>
              <p className="mt-3 text-[11px] leading-relaxed text-[#8d84ad]">One email a month. Edge latency benchmarks, failure-mode postmortems, fleet architecture teardowns. No fluff.</p>
              <form className="mt-3 flex max-w-sm overflow-hidden rounded-xl border border-line2 focus-within:border-gold/50" onSubmit={(e) => { e.preventDefault(); const el = e.currentTarget.querySelector('input'); if (el?.value) { toast('Welcome to the bulletin', `${el.value} added to the EdgeSync dispatch list.`); el.value = ''; } }}>
                <input type="email" required placeholder="you@factory.com" className="w-full bg-panel2 px-3.5 py-2.5 text-[12px] text-cream placeholder-[#6f658f] outline-none" aria-label="Work email" />
                <button type="submit" className="shrink-0 bg-violdeep px-4 text-[11px] font-bold text-violsoft transition-colors hover:bg-viol hover:text-white">Join <ChevronDown size={11} className="inline -rotate-90" /></button>
              </form>
            </div>
          </div>
          <div className="divider-fade my-6" />
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-4 font-mono text-[9px] uppercase tracking-[0.18em] text-[#6f658f]">
              <span>© 2026 EdgeSync Systems NV</span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">Antwerp · Rotterdam · Singapore</span>
            </div>
            <div className="flex items-center gap-4 font-mono text-[9px] uppercase tracking-[0.18em] text-[#6f658f]">
              <span className="inline-flex items-center gap-1.5"><Activity size={10} className="text-emerald-400" /> status.edgesync.io — operational</span>
              <span>SOC 2 Type II</span>
              <span>ISO 27001</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
