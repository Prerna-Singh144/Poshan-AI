import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getMealPlan, getMealPlanJobStatus } from '../api/mealPlanApi.js';
import UplinkLoader from '../components/ui/UplinkLoader.jsx';
import { ThreeDPaper } from '../components/ui/threeui/ThreeDPaper.jsx';
import '../components/ui/threeui/threeui.css';

const isJobId = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '');

function unwrap(value) {
  return value?.mealPlan ?? value?.plan ?? value?.data?.mealPlan ?? value?.data?.plan ?? value?.data ?? value;
}

export default function MealPlanView() {
  const { id } = useParams();
  const [plan, setPlan] = useState(null);
  const [status, setStatus] = useState(!id ? 'empty' : isJobId(id) ? 'queued' : 'loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let timer;
    if (!id) {
      return () => { active = false; };
    }
    async function loadPlan(planId) {
      const response = await getMealPlan(planId);
      if (active) {
        setPlan(unwrap(response));
        setStatus('completed');
      }
    }
    async function poll() {
      try {
        if (!isJobId(id)) {
          await loadPlan(id);
          return;
        }
        const data = unwrap(await getMealPlanJobStatus(id));
        if (!active) return;
        if (data.status === 'completed' && data.planId) {
          setStatus('loading-plan');
          await loadPlan(data.planId);
          return;
        }
        if (data.status === 'failed') {
          setError(data.message || 'Meal-plan generation failed. Please try again.');
          setStatus('failed');
          return;
        }
        setStatus(data.status || 'processing');
        timer = window.setTimeout(poll, 2000);
      } catch (requestError) {
        if (!active) return;
        setError(requestError.message || 'Could not check meal-plan progress.');
        setStatus('failed');
      }
    }
    poll();
    return () => { active = false; window.clearTimeout(timer); };
  }, [id]);

  const viewStatus = id ? status : 'empty';

  if (viewStatus !== 'completed') {
    return (
      <section className="mx-auto max-w-5xl">
        <header className="relative isolate min-h-[360px] overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-10">
          <ThreeDPaper className="meal-plan-paper" variant="original" />
          <div className="absolute inset-0 z-[1] bg-gradient-to-t from-slate-950 via-slate-950/55 to-slate-950/20" aria-hidden="true" />
          <div className="relative z-10 flex min-h-[312px] flex-col justify-end">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-300">PoshanAI · your nutrition guide</p>
            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
              {viewStatus === 'failed' ? 'Plan unavailable' : viewStatus === 'empty' ? 'Your meal plan' : 'Preparing your meal plan'}
            </h1>
            {viewStatus === 'failed' ? (
              <div role="alert" className="mt-3 max-w-2xl text-red-100">
                <p>{error}</p>
                <Link className="mt-4 inline-block font-semibold underline" to="/dashboard">Return to dashboard</Link>
              </div>
            ) : viewStatus === 'empty' ? (
              <div className="mt-3 max-w-2xl">
                <p className="text-sm leading-6 text-white/85">Meal suggestions are educational and do not replace advice from a qualified healthcare professional.</p>
                <Link className="mt-5 inline-flex rounded-xl bg-[#1E5631] px-5 py-3 font-semibold text-white hover:bg-[#173a2c]" to="/diet-plan">Create a basic diet plan</Link>
              </div>
            ) : (
              <UplinkLoader className="mt-5" label={viewStatus === 'loading-plan' ? 'Opening your meal plan…' : 'Generating your personalized meal plan…'} />
            )}
          </div>
        </header>
      </section>
    );
  }

  const meals = Array.isArray(plan?.meals) ? plan.meals : [];
  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <header className="relative isolate min-h-[340px] overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-10">
        <ThreeDPaper className="meal-plan-paper" variant="original" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-slate-950 via-slate-950/55 to-slate-950/20" aria-hidden="true" />
        <div className="relative z-10 flex min-h-[292px] flex-col justify-end">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-300">Personalized nutrition</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{plan?.title || 'Your meal plan'}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/85">{plan?.disclaimer || 'Nutrition suggestions are for awareness and do not replace advice from a qualified healthcare professional.'}</p>
        </div>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {meals.map((meal, index) => (
          <article key={`${meal.day}-${meal.mealType}-${index}`} className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-700">Day {meal.day} · {meal.mealType}</p>
            <ul className="mt-3 space-y-2">{meal.items?.map((item) => <li key={`${item.ifctCode}-${item.foodName}`} className="flex justify-between gap-3 text-sm text-slate-700 dark:text-slate-200"><span>{item.foodName}</span><span className="shrink-0 text-slate-500">{item.quantityGrams} g</span></li>)}</ul>
          </article>
        ))}
      </div>
      {!meals.length && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-amber-900">This plan has no meal details to display.</p>}
    </section>
  );
}
