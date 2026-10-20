import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getMealPlan, getMealPlanJobStatus } from '../api/mealPlanApi.js';
import UplinkLoader from '../components/ui/UplinkLoader.jsx';

const isJobId = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '');

function unwrap(value) {
  return value?.mealPlan ?? value?.plan ?? value?.data?.mealPlan ?? value?.data?.plan ?? value?.data ?? value;
}

export default function MealPlanView() {
  const { id } = useParams();
  const [plan, setPlan] = useState(null);
  const [status, setStatus] = useState(isJobId(id) ? 'queued' : 'loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let timer;
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

  if (status !== 'completed') {
    return (
      <section className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        {status === 'failed' ? <div role="alert" className="text-red-700"><h1 className="text-2xl font-bold">Plan unavailable</h1><p className="mt-2">{error}</p><Link className="mt-4 inline-block underline" to="/dashboard">Return to dashboard</Link></div> : <><h1 className="text-3xl font-bold text-slate-900 dark:text-white">Your meal plan</h1><UplinkLoader className="mt-6" label={status === 'loading-plan' ? 'Opening your meal plan…' : 'Generating your personalized meal plan…'} /></>}
      </section>
    );
  }

  const meals = Array.isArray(plan?.meals) ? plan.meals : [];
  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <header className="rounded-2xl bg-gradient-to-br from-emerald-50 to-white p-6 dark:from-emerald-950/40 dark:to-slate-900">
        <p className="text-sm font-semibold uppercase tracking-wider text-leaf">Personalized nutrition</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{plan?.title || 'Your meal plan'}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{plan?.disclaimer || 'Nutrition suggestions are for awareness and do not replace advice from a qualified healthcare professional.'}</p>
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
