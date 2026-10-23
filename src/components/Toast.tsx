import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, Radio, X } from 'lucide-react';

interface ToastItem { id: number; title: string; detail?: string }
const ToastCtx = createContext<(title: string, detail?: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const push = useCallback((title: string, detail?: string) => {
    const id = ++toastId;
    setToasts((t) => [...t.slice(-2), { id, title, detail }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex w-[340px] flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="panel noise pointer-events-auto flex items-start gap-3 overflow-hidden p-3.5 backdrop-blur-xl" style={{ borderColor: 'rgba(244,198,74,0.3)' }}>
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold"><CheckCircle2 size={15} /></span>
            <div className="min-w-0">
              <div className="text-[12px] font-bold text-cream leading-snug">{t.title}</div>
              {t.detail && <div className="mt-0.5 text-[10.5px] leading-snug text-[#a99dd0]">{t.detail}</div>}
            </div>
            <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="ml-auto text-[#8d84ad] transition-colors hover:text-cream" aria-label="Dismiss"><X size={14} /></button>
            <span className="pointer-events-none absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-gold to-golddeep" />
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <a href="/" className="group flex items-center gap-2.5">
      <svg width="34" height="34" viewBox="0 0 64 64" className="shrink-0 transition-transform duration-300 group-hover:scale-105">
        <path d="M32 3 58 17.5v29L32 61 6 46.5v-29L32 3z" fill="#6d28d9" />
        <path d="M32 8.5 53.5 20.5v23L32 55.5 10.5 43.5v-23L32 8.5z" fill="#0D0A17" />
        <path d="M35.5 14 22 35h8.2L28.5 50 43 29h-8.6L39.7 14h-4.2z" fill="#F4C64A" />
      </svg>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[21px] font-black tracking-tight text-cream">Edge<span className="gold-text">Sync</span></span>
          <span className="mt-[3px] font-mono text-[7px] uppercase tracking-[0.34em] text-[#8d84ad]">Edge-to-Cloud Intelligence</span>
        </span>
      )}
    </a>
  );
}

export function LivePill() {
  return (
    <span className="hidden items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/8 py-1 pl-2.5 pr-3 sm:inline-flex">
      <span className="relative flex h-2 w-2">
        <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
      </span>
      <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-emerald-300">Live · 2 sites · 18 devices</span>
    </span>
  );
}

export function ConsoleLiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 font-mono text-[8.5px] font-bold uppercase tracking-[0.2em] text-gold">
      <Radio size={10} className="blink" /> Telemetry Live
    </span>
  );
}
