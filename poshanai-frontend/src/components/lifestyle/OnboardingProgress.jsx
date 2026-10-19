import { motion, useReducedMotion } from 'framer-motion';

export default function OnboardingProgress({ step, total, title }) {
  const reduceMotion = useReducedMotion();
  const current = step + 1;
  return (
    <div>
      <p className="text-sm font-semibold text-leaf dark:text-emerald-300" aria-live="polite">
        Step {current} of {total}
        <span className="sr-only">: {title}</span>
      </p>
      <div
        role="progressbar"
        aria-label="Onboarding progress"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-valuetext={`Step ${current} of ${total}: ${title}`}
        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
      >
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-leaf to-emerald-500"
          initial={false}
          animate={{ width: `${(current / total) * 100}%` }}
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 140, damping: 22 }}
        />
      </div>
    </div>
  );
}
