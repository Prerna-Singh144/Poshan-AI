import { motion } from 'framer-motion';
import { Activity, Check, LockKeyhole } from 'lucide-react';
import './uplink-loader.css';

export default function UplinkLoader({ label = 'Preparing your nutrition data', progress, className = '' }) {
  const determinate = Number.isFinite(progress);
  const value = determinate ? Math.max(0, Math.min(100, progress)) : 68;

  return (
    <section className={`uplink-loader ${className}`} role="status" aria-live="polite" aria-label={label}>
      <div className="uplink-loader__frame" aria-hidden="true">
        <span className="uplink-loader__corner uplink-loader__corner--tl" />
        <span className="uplink-loader__corner uplink-loader__corner--tr" />
        <span className="uplink-loader__corner uplink-loader__corner--bl" />
        <span className="uplink-loader__corner uplink-loader__corner--br" />
        <span className="uplink-loader__rail" />
        <motion.span
          className="uplink-loader__scan"
          animate={{ y: ['-100%', '350%'] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
        />
        <div className="uplink-loader__orbit"><span /><span /><span /></div>
      </div>
      <div className="uplink-loader__meta">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900">
          <LockKeyhole size={14} aria-hidden="true" /> Secure health workspace
        </div>
        <p className="mt-2 text-lg font-semibold text-slate-900">{label}</p>
        <div className="mt-4 flex items-center gap-3">
          <div className="uplink-loader__track" aria-hidden="true">
            <motion.span
              animate={{ width: `${value}%` }}
              transition={{ type: 'spring', stiffness: 90, damping: 20 }}
            />
          </div>
          <span className="min-w-10 text-right text-xs tabular-nums text-slate-600">
            {determinate ? `${Math.round(value)}%` : <Activity size={14} className="inline animate-pulse" aria-label="Working" />}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-500">
          <span>PoshanAI · {determinate && value >= 100 ? 'Ready' : 'Processing'}</span>
          {determinate && value >= 100 && <Check size={14} className="text-emerald-700" />}
        </div>
      </div>
    </section>
  );
}
