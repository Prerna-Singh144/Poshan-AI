const ICONS = {
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  capsule: (
    <>
      <rect x="2.5" y="8" width="19" height="8" rx="4" transform="rotate(-35 12 12)" />
      <path d="M9.3 8.1l5.4 7.8" />
    </>
  ),
  drop: <path d="M12 3s6 6.3 6 10.5a6 6 0 0 1-12 0C6 9.3 12 3 12 3z" />,
  nut: (
    <>
      <path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9L12 3z" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  stack: (
    <>
      <rect x="4" y="4" width="16" height="6" rx="2" />
      <rect x="4" y="14" width="16" height="6" rx="2" />
      <path d="M8 7h.01M8 17h.01" />
    </>
  ),
  heart: <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" />,
  pulse: <path d="M3 12h4l3-7 4 14 3-7h4" />,
  flask: (
    <>
      <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3" />
      <path d="M7.5 15h9" />
    </>
  ),
};

// Visual metadata only; the reason text always comes from the rules engine.
const TEST_META = {
  'Vitamin D': { icon: 'sun', tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  'Vitamin B12': { icon: 'capsule', tone: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' },
  Iron: { icon: 'nut', tone: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' },
  Ferritin: { icon: 'stack', tone: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300' },
  Hemoglobin: { icon: 'drop', tone: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
  'Lipid Profile': { icon: 'heart', tone: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300' },
  HbA1c: { icon: 'pulse', tone: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300' },
};
const FALLBACK_META = {
  icon: 'flask',
  tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
};

export default function TestIcon({ testName, size = 'md' }) {
  const meta = TEST_META[testName] ?? FALLBACK_META;
  const box = size === 'lg' ? 'h-14 w-14' : 'h-12 w-12';
  return (
    <span aria-hidden="true" className={`flex ${box} shrink-0 items-center justify-center rounded-2xl ${meta.tone}`}>
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {ICONS[meta.icon]}
      </svg>
    </span>
  );
}
