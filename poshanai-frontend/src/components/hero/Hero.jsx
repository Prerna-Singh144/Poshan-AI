import { motion } from 'framer-motion';
import { Suspense, lazy, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useMediaQuery from '../../hooks/useMediaQuery.js';
import HeroFallback from './HeroFallback.jsx';

const Hero3D = lazy(() => import('./Hero3D.jsx'));

export default function Hero() {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [theme, setTheme] = useState(() => (document.documentElement.classList.contains('dark') ? 'dark' : 'light'));

  useEffect(() => {
    const syncTheme = () => {
      setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    };

    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative overflow-hidden bg-cream px-5 py-10 text-slate-800 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100 sm:px-8 md:px-10 lg:px-12">
      <div className="mx-auto grid max-w-7xl items-center gap-10 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="max-w-xl"
        >
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-leaf">Nutrition, grounded in India</p>
          <h1 className="font-heading text-4xl font-bold leading-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
            PoshanAI
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
            AI-Powered Micronutrient Deficiency Diet Planner
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/login"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-leaf px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-leaf-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2"
            >
              Get started
            </Link>
            <Link
              to="/register"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-transparent px-6 py-3 text-base font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Create account
            </Link>
          </div>

          <div className="mt-8 rounded-2xl border border-emerald-100 bg-white/80 p-4 text-sm leading-7 text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200">
            PoshanAI provides nutrition awareness and suggestions. It does not diagnose or replace advice from a qualified healthcare professional.
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.12 }}
          className="relative"
        >
          <div className="relative mx-auto h-[420px] w-full max-w-[560px] overflow-hidden rounded-[2rem] border border-emerald-100 bg-white/80 shadow-[0_25px_60px_rgba(30,86,49,0.14)] dark:border-slate-700 dark:bg-slate-900/50">
            {isDesktop ? (
              <Suspense fallback={<HeroFallback loading />}>
                <Hero3D theme={theme} />
              </Suspense>
            ) : (
              <HeroFallback />
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
