import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, Flame, Leaf, LoaderCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { getDietPlans } from '../api/dietPlanApi.js';
import { getApiError } from '../api/client.js';

function downloadGroceryList(meals) {
  const groceryItems = new Map();
  meals.forEach((meal) => meal.items?.forEach((item) => {
    const key = item.ifctCode || item.foodName;
    const current = groceryItems.get(key) ?? { foodName: item.foodName, quantity: 0 };
    current.quantity += Number(item.quantity) || 0;
    groceryItems.set(key, current);
  }));
  const content = [
    'PoshanAI grocery list',
    '',
    ...[...groceryItems.values()].map(({ foodName, quantity }) => `- ${foodName} — ${Math.round(quantity)} g`),
  ].join('\n');
  const file = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'poshanai-grocery-list.txt';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function DietPlanResult() {
  const location = useLocation();
  const [plan, setPlan] = useState(location.state?.plan ?? null);
  const [isLoading, setIsLoading] = useState(!location.state?.plan);
  const [error, setError] = useState('');

  useEffect(() => {
    if (plan) return undefined;
    let cancelled = false;
    getDietPlans()
      .then((plans) => {
        if (!cancelled) setPlan(plans.find((item) => item.type === 'basic') ?? null);
      })
      .catch((requestError) => {
        if (!cancelled) setError(getApiError(requestError));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [plan]);

  const totalCalories = useMemo(
    () => plan?.meals?.reduce((total, meal) => total + (Number(meal.calories) || 0), 0) ?? 0,
    [plan],
  );
  const progress = plan?.targetCalories ? Math.min(100, (totalCalories / plan.targetCalories) * 100) : 0;

  if (isLoading) return <div className="flex min-h-64 items-center justify-center text-emerald-800" role="status"><LoaderCircle className="animate-spin" /> <span className="ml-2">Loading your plan…</span></div>;
  if (error) return <div className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-800" role="alert">{error} <Link to="/diet-plan" className="ml-2 underline">Try again</Link></div>;
  if (!plan) return (
    <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-sm">
      <Leaf className="mx-auto text-emerald-700" size={34} /><h1 className="mt-4 text-2xl font-bold text-slate-900">No diet plan yet</h1>
      <p className="mt-2 text-slate-600">Complete the short wizard to get your basic plan.</p><Link to="/diet-plan" className="mt-5 inline-flex rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white">Start the wizard</Link>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/diet-plan" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-950"><ArrowLeft size={16} /> Create another plan</Link>
      <div className="mt-5 flex flex-col justify-between gap-5 rounded-3xl bg-emerald-950 p-6 text-white sm:flex-row sm:items-end sm:p-9">
        <div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-200">Your basic diet plan</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">A steady plan for your day</h1><p className="mt-2 text-emerald-100">Built around your goal and food preferences.</p></div>
        <button type="button" onClick={() => downloadGroceryList(plan.meals ?? [])} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-semibold text-emerald-950 hover:bg-emerald-50"><Download size={17} /> Download grocery list</button>
      </div>

      <section className="mt-5 grid gap-4 md:grid-cols-[1.2fr_1fr]" aria-label="Daily nutrition overview">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-emerald-950/5">
          <div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">Calories in this plan</p><p className="mt-1 text-3xl font-bold text-slate-900">{Math.round(totalCalories).toLocaleString()} <span className="text-base font-medium text-slate-500">kcal</span></p></div><span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-50 text-orange-600"><Flame size={22} /></span></div>
          <div className="mt-5 flex items-center justify-between text-sm"><span className="font-medium text-slate-700">Daily target</span><span className="text-slate-500">{Number(plan.targetCalories).toLocaleString()} kcal</span></div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-emerald-100"><div className="h-full rounded-full bg-emerald-700 transition-all" style={{ width: `${progress}%` }} /></div>
          <p className="mt-2 text-xs text-slate-500">Portion calories are estimated from IFCT food data.</p>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-emerald-950/5">
          <p className="text-sm font-medium text-slate-500">Daily macros</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: 'Protein', value: plan.macros?.protein, color: 'bg-emerald-100 text-emerald-900' },
              { label: 'Carbs', value: plan.macros?.carbs, color: 'bg-amber-100 text-amber-900' },
              { label: 'Fat', value: plan.macros?.fat, color: 'bg-orange-100 text-orange-900' },
            ].map((macro) => <div key={macro.label} className={`rounded-2xl p-3 ${macro.color}`}><p className="text-xs font-medium opacity-75">{macro.label}</p><p className="mt-1 text-xl font-bold">{Number(macro.value ?? 0).toFixed(1)}<span className="ml-1 text-xs font-medium">g</span></p></div>)}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4"><p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Your day</p><h2 className="mt-1 text-2xl font-bold text-slate-900">Meals and portions</h2></div>
        <div className="grid gap-4 md:grid-cols-2">
          {(plan.meals ?? []).map((meal, index) => (
            <article key={`${meal.mealName}-${index}`} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-emerald-950/5">
              <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-bold text-slate-900">{meal.mealName}</h3><p className="mt-1 text-sm text-slate-500">{Number(meal.calories).toFixed(0)} kcal</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">Meal {index + 1}</span></div>
              <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                {(meal.items ?? []).map((item) => <li key={item.ifctCode} className="flex items-center justify-between gap-3 text-sm"><span className="text-slate-700">{item.foodName}</span><span className="shrink-0 font-medium text-slate-500">{Number(item.quantity).toFixed(0)} g</span></li>)}
              </ul>
              {meal.swapSuggestion && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm leading-5 text-emerald-900"><span className="font-semibold">Optional swap:</span> {meal.swapSuggestion}</p>}
            </article>
          ))}
        </div>
      </section>
      {plan.disclaimer && <p className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">{plan.disclaimer}</p>}
    </div>
  );
}
