import { motion, useReducedMotion } from 'framer-motion';
import { formatAmount, getStatus } from '../../utils/nutrition.js';

const SIZE = 200;
const STROKE = 16;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function CalorieRing({ consumed, target }) {
  const reduceMotion = useReducedMotion();
  const status = getStatus(consumed, target);
  const ratio = target > 0 ? consumed / target : 0;
  const filled = Math.min(ratio, 1);
  const difference = Math.round(Math.abs(target - consumed));
  const summary = `Calories: ${formatAmount(consumed)} of ${target} kilocalories, ${Math.round(ratio * 100)} percent. ${status.label}.`;

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-48 w-48 sm:h-56 sm:w-56" role="img" aria-label={summary}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-slate-200 dark:stroke-slate-800" />
          <motion.circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            className={`${status.stroke} transition-[stroke] duration-500`}
            initial={false}
            animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - filled), opacity: filled > 0 ? 1 : 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.7, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center" aria-hidden="true">
          <span className="text-4xl font-bold tabular-nums text-slate-900 dark:text-white">{formatAmount(consumed)}</span>
          <span className="text-sm text-slate-500 dark:text-slate-400">/ {target} kcal</span>
        </div>
      </div>
      <p className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${status.pill}`} aria-live="polite">
        <span aria-hidden="true">{status.glyph}</span>
        {status.label}
        <span className="font-normal">
          {' · '}
          {ratio > 1 ? `${difference} kcal over` : `${difference} kcal left`}
        </span>
      </p>
    </div>
  );
}
