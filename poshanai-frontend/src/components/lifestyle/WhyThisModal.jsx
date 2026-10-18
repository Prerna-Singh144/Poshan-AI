import { useEffect, useState } from 'react';
import { explainTest } from '../../api/lifestyleApi.js';
import { getApiError } from '../../api/client.js';
import { Button, Modal, Skeleton } from '../common/index.js';
import TestIcon from './TestIcon.jsx';

const FALLBACK_DISCLAIMER = 'Consult a doctor before taking any test or treatment.';
const LANGUAGES = [
  { value: 'hinglish', label: 'Hinglish' },
  { value: 'english', label: 'English' },
];

export default function WhyThisModal({ test, isOpen, onClose }) {
  const [language, setLanguage] = useState('hinglish');
  // Results are kept in memory only, keyed by language + test + reason.
  const [results, setResults] = useState({});
  const key = test ? `${language}|${test.testName}|${test.reason}` : null;
  const entry = key ? results[key] : undefined;
  const hasEntry = Boolean(entry);

  useEffect(() => {
    if (!isOpen || !key || hasEntry) return undefined;
    const controller = new AbortController();
    explainTest(
      { testName: test.testName, reason: test.reason, language },
      { signal: controller.signal },
    )
      .then((data) => setResults((current) => ({ ...current, [key]: { data } })))
      .catch((error) => {
        if (controller.signal.aborted || error.name === 'CanceledError') return;
        setResults((current) => ({ ...current, [key]: { error: getApiError(error) } }));
      });
    return () => controller.abort();
  }, [isOpen, key, hasEntry, test, language]);

  const retry = () =>
    setResults((current) => Object.fromEntries(Object.entries(current).filter(([k]) => k !== key)));

  if (!test) return null;
  const isLoading = isOpen && !entry;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Why ${test.testName}?`}>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <TestIcon testName={test.testName} size="lg" />
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Suggested from your lifestyle answers.
          </p>
        </div>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">The reason</h3>
          <p className="mt-1 text-sm text-slate-800 dark:text-slate-100">{test.reason}</p>
        </section>

        <section aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">In simple words</h3>
            <div role="group" aria-label="Explanation language" className="flex rounded-full bg-slate-100 p-0.5 dark:bg-slate-800">
              {LANGUAGES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={language === option.value}
                  onClick={() => setLanguage(option.value)}
                  className={`min-h-[2.75rem] rounded-full px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf ${language === option.value ? 'bg-white text-leaf shadow-sm dark:bg-slate-700 dark:text-emerald-200' : 'text-slate-600 dark:text-slate-300'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-2 min-h-[3.5rem]">
            {isLoading && (
              <div role="status" aria-label="Loading explanation" className="space-y-2">
                <Skeleton height="4" />
                <Skeleton height="4" width="threeQuarters" />
              </div>
            )}
            {entry?.data && <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-100">{entry.data.explanation}</p>}
            {entry?.error && (
              <div role="alert" className="space-y-2">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  The simple explanation is not available right now. The reason above still applies.
                </p>
                <Button variant="ghost" size="sm" onClick={retry}>Try again</Button>
              </div>
            )}
          </div>
        </section>

        <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          {entry?.data?.disclaimer ?? FALLBACK_DISCLAIMER}
        </p>
        <Button className="w-full" onClick={onClose}>Got it</Button>
      </div>
    </Modal>
  );
}
