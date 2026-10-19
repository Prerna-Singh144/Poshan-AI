import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRecommendations } from '../api/lifestyleApi.js';
import { Button, Card, Skeleton } from '../components/common/index.js';
import TestCard from '../components/lifestyle/TestCard.jsx';
import WhyThisModal from '../components/lifestyle/WhyThisModal.jsx';

const primaryLink =
  'inline-flex w-full items-center justify-center rounded-lg bg-leaf px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2 sm:w-auto';
const secondaryLink =
  'inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white sm:w-auto';

// Turns an API failure into a human message plus a small technical detail for debugging.
function describeFailure(error) {
  const { status = 0, code = 'UNKNOWN', message } = error.apiError ?? {};
  let text = message || 'Something went wrong.';
  if (status === 0) {
    text = 'Could not reach the server. Check your connection and that the backend is running.';
  } else if (status === 404 && code === 'NOT_FOUND') {
    text = 'The lifestyle service was not found on the server. Make sure the backend is up to date and restarted.';
  }
  return { message: text, detail: `${status || 'Network'} · ${code}` };
}

function LoadingList() {
  return (
    <ul className="mt-6 space-y-3" aria-label="Loading your recommendations" role="status">
      {[0, 1, 2].map((key) => (
        <li key={key}>
          <Card padding="sm" className="flex items-start gap-3">
            <Skeleton width="48px" height="12" rounded="xl" className="w-12 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton width="40" height="5" />
              <Skeleton height="4" />
              <Skeleton width="threeQuarters" height="4" />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

export default function Recommendations() {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ status: 'loading' });
  const [selected, setSelected] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getRecommendations({ signal: controller.signal })
      .then((data) => {
        if (Array.isArray(data)) {
          setState({ status: data.length === 0 ? 'needs-onboarding' : 'ready', data });
          return;
        }
        setState({ status: 'ready', data });
      })
      .catch((error) => {
        if (controller.signal.aborted || error.name === 'CanceledError') return;
        const code = error.apiError?.code;
        if (code === 'LIFESTYLE_PROFILE_NOT_FOUND' || code === 'ONBOARDING_INCOMPLETE') {
          setState({ status: 'needs-onboarding' });
        } else {
          setState({ status: 'error', ...describeFailure(error) });
        }
      });
    return () => controller.abort();
  }, [attempt]);

  const retry = () => {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  };
  const openWhyThis = (test) => {
    setSelected(test);
    setIsModalOpen(true);
  };

  const tests = Array.isArray(state.data) ? state.data : state.data?.recommendations ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header>
        <p className="text-sm font-semibold text-leaf dark:text-emerald-300">Your lifestyle check</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
          Tests worth discussing with your doctor
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Based on your answers. These are suggestions, not a diagnosis.
        </p>
      </header>

      {state.status === 'loading' && <LoadingList />}

      {state.status === 'error' && (
        <Card className="mt-6 text-center" role="alert">
          <p className="text-3xl" aria-hidden="true">⚠️</p>
          <p className="font-semibold text-slate-900 dark:text-white">We could not load your tests.</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{state.message}</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Error: {state.detail}</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button className="w-full sm:w-auto" onClick={retry}>Try again</Button>
            <Link to="/onboarding" className={secondaryLink}>Complete Lifestyle Profile</Link>
          </div>
        </Card>
      )}

      {state.status === 'needs-onboarding' && (
        <Card className="mt-6 text-center" role="alert">
          <p className="text-3xl" aria-hidden="true">📝</p>
          <p className="mt-2 font-semibold text-slate-900 dark:text-white">Your lifestyle profile is not complete yet</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Answer a few quick questions and we will suggest tests worth discussing with your doctor. It takes about two minutes.
          </p>
          <Link to="/onboarding" className={`${primaryLink} mt-4`}>Complete Lifestyle Profile</Link>
        </Card>
      )}

      {state.status === 'ready' && (
        <>
          {tests.length === 0 ? (
            <Card className="mt-6 text-center">
              <p className="text-3xl" aria-hidden="true">✅</p>
              <p className="mt-2 font-semibold text-slate-900 dark:text-white">No specific tests suggested</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Your answers did not match any of our suggestions. Talk to your doctor about routine check-ups.
              </p>
            </Card>
          ) : (
            <>
              <p className="mt-5 text-sm font-medium text-slate-700 dark:text-slate-200" aria-live="polite">
                {tests.length} {tests.length === 1 ? 'test' : 'tests'} suggested
              </p>
              <ul className="mt-3 space-y-3">
                {tests.map((test, index) => (
                  <TestCard key={test.testName} test={test} index={index} onWhyThis={openWhyThis} />
                ))}
              </ul>
            </>
          )}

          <p className="mt-6 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
            {state.data.disclaimer}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link to="/upload" className={primaryLink}>Upload my report</Link>
            <Link to="/onboarding" className={secondaryLink}>Update my answers</Link>
          </div>
        </>
      )}

      <WhyThisModal test={selected} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
