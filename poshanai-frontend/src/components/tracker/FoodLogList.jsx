import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { formatAmount } from '../../utils/nutrition.js';

export default function FoodLogList({ entries }) {
  const reduceMotion = useReducedMotion();
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800" aria-live="polite" aria-label="Foods logged today">
      <AnimatePresence initial={false}>
        {[...entries].reverse().map((entry) => (
          <motion.li
            key={entry.id}
            layout={!reduceMotion}
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: entry.pending ? 0.65 : 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24 }}
            transition={{ duration: 0.25 }}
            className="flex items-center justify-between gap-3 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{entry.foodName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {entry.quantity && entry.measure && entry.measure !== 'grams' && (
                  <>{entry.quantity} {entry.measure}{entry.quantity === 1 ? '' : 's'} · </>
                )}
                {formatAmount(entry.grams)} g
                {entry.pending && <span className="ml-2 font-medium text-slate-600 dark:text-slate-300">· Saving…</span>}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
              {formatAmount(entry.calories)} kcal
            </p>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
