import { motion, useReducedMotion } from 'framer-motion';
import { Button, Card } from '../common/index.js';
import TestIcon from './TestIcon.jsx';

export default function TestCard({ test, index, onWhyThis }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.li
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index, 6) * 0.07, ease: 'easeOut' }}
    >
      <Card padding="sm" className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <TestIcon testName={test.testName} />
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">{test.testName}</h2>
            <p className="mt-1 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">{test.reason}</p>
          </div>
        </div>
        <Button
          variant="secondary"
          className="w-full sm:w-auto"
          onClick={() => onWhyThis(test)}
          aria-label={`Why ${test.testName}?`}
        >
          Why this?
        </Button>
      </Card>
    </motion.li>
  );
}
