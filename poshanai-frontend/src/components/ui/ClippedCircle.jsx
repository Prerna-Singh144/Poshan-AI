import { motion } from 'framer-motion';
import { cn } from './cn.js';

export default function ClippedCircle({ isRevealed = false, className }) {
  return (
    <motion.div
      aria-hidden="true"
      initial={false}
      animate={
        isRevealed
          ? { opacity: 1, scale: 1.12, x: 0, y: 0 }
          : { opacity: 0.76, scale: 0.76, x: 18, y: -12 }
      }
      transition={{ type: 'spring', stiffness: 180, damping: 20 }}
      className={cn(
        'pointer-events-none absolute rounded-full bg-[radial-gradient(circle_at_30%_30%,#e1f3df_0%,#b7dfbe_48%,#f8d4b9_100%)]',
        className,
      )}
      style={{ clipPath: 'circle(50% at 50% 50%)' }}
    />
  );
}
