import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Hero from '../components/hero/Hero.jsx';

const principles = [
  {
    number: '01',
    title: 'Rooted in Indian food',
    description:
      'Meal ideas are designed around familiar ingredients and the variety of Indian food traditions.',
  },
  {
    number: '02',
    title: 'Personal context matters',
    description:
      'Food preferences, daily routines, and relevant nutrition information help shape a more useful experience.',
  },
  {
    number: '03',
    title: 'Guidance, not diagnosis',
    description:
      'Nutrition information can support awareness, but only a qualified healthcare professional can diagnose or treat a condition.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Start with your profile',
    description:
      'Share basic details and food preferences to make your PoshanAI experience more relevant.',
  },
  {
    number: '02',
    title: 'Bring your nutrition context',
    description:
      'Keep your goals and relevant information in view as you explore nutrition awareness.',
  },
  {
    number: '03',
    title: 'Explore practical meal ideas',
    description:
      'Discover approachable ideas inspired by Indian ingredients and everyday meals.',
  },
];

function Reveal({ children, className = '', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function LandingPage() {
  return (
    <main>
      <Hero />

      <section
        className="bg-white px-5 py-20 text-slate-800 dark:bg-slate-900 dark:text-slate-100 sm:px-8 lg:py-24"
        aria-labelledby="approach-title"
      >
        <div className="mx-auto max-w-7xl">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-leaf dark:text-emerald-300">
              A more thoughtful approach
            </p>
            <h2
              id="approach-title"
              className="mt-4 font-heading text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl"
            >
              Nutrition that starts with your plate.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
              PoshanAI is being built to make nutrition awareness feel more
              personal, practical, and connected to the food you already know.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {principles.map((principle, index) => (
              <Reveal key={principle.number} delay={index * 0.08}>
                <article className="h-full rounded-3xl border border-emerald-100 bg-cream p-6 dark:border-slate-700 dark:bg-slate-800 sm:p-7">
                  <span
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 font-heading text-sm font-bold text-leaf dark:bg-emerald-900/60 dark:text-emerald-200"
                    aria-hidden="true"
                  >
                    {principle.number}
                  </span>
                  <h3 className="mt-6 font-heading text-xl font-semibold text-slate-900 dark:text-white">
                    {principle.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {principle.description}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="bg-cream px-5 py-20 text-slate-800 dark:bg-slate-950 dark:text-slate-100 sm:px-8 lg:py-24"
        aria-labelledby="steps-title"
      >
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <Reveal className="max-w-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange">
              Getting started
            </p>
            <h2
              id="steps-title"
              className="mt-4 font-heading text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl"
            >
              Small steps toward more informed choices.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
              A simple path to bring your food preferences and nutrition
              questions together.
            </p>
            <p className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              PoshanAI provides nutrition awareness and suggestions. It does
              not diagnose, treat, or replace advice from a qualified
              healthcare professional.
            </p>
          </Reveal>

          <ol className="space-y-4">
            {steps.map((step, index) => (
              <Reveal key={step.number} delay={index * 0.08}>
                <li className="flex gap-5 rounded-3xl border border-emerald-100 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 sm:p-6">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-leaf font-heading text-sm font-bold text-white"
                    aria-hidden="true"
                  >
                    {step.number}
                  </span>
                  <div>
                    <h3 className="font-heading text-lg font-semibold text-slate-900 dark:text-white">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {step.description}
                    </p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:py-20" aria-labelledby="cta-title">
        <Reveal className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 rounded-[2rem] bg-leaf px-6 py-10 text-white sm:px-10 sm:py-12 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <h2 id="cta-title" className="font-heading text-2xl font-bold sm:text-3xl">
              Make space for better-informed food choices.
            </h2>
            <p className="mt-3 text-sm leading-6 text-emerald-50 sm:text-base">
              Create your account and start building a nutrition experience
              around your preferences.
            </p>
          </div>
          <Link
            to="/register"
            className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-leaf transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-leaf"
          >
            Create your account
          </Link>
        </Reveal>
      </section>
    </main>
  );
}
