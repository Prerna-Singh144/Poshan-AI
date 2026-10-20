import { motion, useReducedMotion } from 'framer-motion';
import { formatAmount, getStatus } from '../../utils/nutrition.js';

export default function MacroBar({ label, consumed, target }) {
  const reduceMotion = useReducedMotion();
  const status = getStatus(consumed, target);
  const ratio = target > 0 ? consumed / target : 0;
  const over = Math.round((consumed - target) * 10) / 10;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</span>
        <span className="text-sm tabular-nums text-slate-600 dark:text-slate-300">
          <strong className="text-slate-900 dark:text-white">{formatAmount(consumed)}</strong> / {target} g
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={Math.max(target, consumed)}
        aria-valuenow={consumed}
        aria-valuetext={`${formatAmount(consumed)} of ${target} grams. ${status.label}.`}
        className="mt-1.5 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
      >
        <motion.div
          className={`h-full rounded-full ${status.bar} transition-colors duration-500`}
          initial={false}
          animate={{ width: `${Math.min(ratio, 1) * 100}%` }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <p className={`mt-1 text-xs font-medium ${status.text}`}>
        <span aria-hidden="true">{status.glyph} </span>
        {status.label}
        {ratio > 1 && ` by ${formatAmount(over)} g`}
      </p>
    </div>
  );
}
