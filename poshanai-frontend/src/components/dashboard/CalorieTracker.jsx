import { useCallback, useEffect, useMemo, useState } from 'react';
import client from '../../api/client.js';
import {
  addFoodToLog,
  addSupplementToLog,
  getTodayLog,
  searchIfctFoods,
} from '../../api/dailyLogApi.js';
import { Button, Card, Modal } from '../common/index.js';

const initialLog = {
  meals: [],
  supplements: [],
  totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  calorieComparison: { target: null },
  micronutrients: { rdaComparison: [] },
};
const emptyComparisons = [];

const round = (value) => Math.round((value + Number.EPSILON) * 10) / 10;
const macroDefinitions = [
  { key: 'protein', label: 'Protein', color: 'bg-emerald-600' },
  { key: 'carbs', label: 'Carbs', color: 'bg-amber-500' },
  { key: 'fat', label: 'Fat', color: 'bg-sky-600' },
];
const micronutrientDefinitions = [
  { nutrient: 'Vitamin D', suggestion: 'fortified foods or eggs' },
  { nutrient: 'Vitamin B12', suggestion: 'dairy, eggs, or fortified foods' },
  { nutrient: 'Iron', suggestion: 'spinach, lentils, or beans' },
];

function formatAmount(value) {
  return Number.isFinite(Number(value)) ? round(Number(value)).toLocaleString() : '—';
}

function ProgressRow({ label, consumed, target, unit = 'g', color = 'bg-emerald-600' }) {
  const hasValue = consumed !== null && consumed !== undefined;
  const percentage = target > 0 ? Math.min(100, Math.max(0, (consumed / target) * 100)) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
        <span className="text-slate-500 dark:text-slate-400">
          {hasValue ? `${formatAmount(consumed)} / ` : 'Data unavailable / '}{target ? `${formatAmount(target)} ${unit}` : 'target unavailable'}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" aria-label={`${label} progress`} aria-valuetext={hasValue ? `${formatAmount(consumed)} of ${formatAmount(target)} ${unit}` : 'Data unavailable'} aria-valuemin="0" aria-valuemax={target || 100} aria-valuenow={hasValue ? Math.min(consumed, target || 100) : 0}>
        <div className={`h-full rounded-full transition-all ${hasValue ? color : 'bg-slate-300 dark:bg-slate-600'}`} style={{ width: `${hasValue ? percentage : 0}%` }} />
      </div>
    </div>
  );
}

function Ring({ consumed, target }) {
  const ratio = target > 0 ? consumed / target : 0;
  const percentage = Math.round(ratio * 100);
  const color = ratio > 1 ? '#dc2626' : ratio >= 1 ? '#244b36' : ratio >= 0.8 ? '#d97706' : '#244b36';
  return (
    <div
      className="grid h-44 w-44 shrink-0 place-items-center rounded-full"
      role="img"
      aria-label={`${formatAmount(consumed)} of ${target ? formatAmount(target) : 'unknown'} calories`}
      style={{ background: `conic-gradient(${color} ${Math.min(percentage, 100)}%, #e2e8f0 0)` }}
    >
      <div className="grid h-36 w-36 content-center justify-items-center rounded-full bg-white dark:bg-slate-900">
        <span className="text-3xl font-bold text-slate-900 dark:text-white">{formatAmount(consumed)}</span>
        <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">of {target ? `${formatAmount(target)} kcal` : 'target unavailable'}</span>
        <span className="mt-2 text-xs font-semibold" style={{ color }}>{percentage}%</span>
      </div>
    </div>
  );
}

export default function CalorieTracker() {
  const [today, setToday] = useState(initialLog);
  const [macroTargets, setMacroTargets] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [foodModalOpen, setFoodModalOpen] = useState(false);
  const [supplementModalOpen, setSupplementModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [foods, setFoods] = useState([]);
  const [resultQuery, setResultQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedFood, setSelectedFood] = useState(null);
  const [grams, setGrams] = useState('100');
  const [mealType, setMealType] = useState('snack');
  const [savingFood, setSavingFood] = useState(false);
  const [foodError, setFoodError] = useState('');
  const [supplementName, setSupplementName] = useState('Vitamin D3 60k IU');
  const [vitamins, setVitamins] = useState({ vitaminD: '60000', b12: '0', iron: '0', calcium: '0' });
  const [savingSupplement, setSavingSupplement] = useState(false);
  const [supplementError, setSupplementError] = useState('');

  const refresh = useCallback(async (signal) => {
    const log = await getTodayLog({ signal });
    setToday({ ...initialLog, ...log, totals: { ...initialLog.totals, ...log.totals } });
    return log;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      Promise.allSettled([
        refresh(controller.signal),
        client.get('/calories/maintenance', { signal: controller.signal }).then((response) => {
          const data = response.data?.data ?? response.data;
          setMacroTargets(data.macros);
        }),
      ]).then(([logResult, targetResult]) => {
        if (controller.signal.aborted) return;
        if (logResult.status === 'rejected') setLoadError(logResult.reason?.message || 'Could not load today’s log.');
        if (targetResult.status === 'rejected' && !logResult.value?.calorieComparison?.target) {
          setMacroTargets(null);
        }
      }).finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [refresh]);

  useEffect(() => {
    if (!foodModalOpen || search.trim().length < 2) return undefined;
    const controller = new AbortController();
    const query = search.trim();
    const timer = window.setTimeout(() => {
      setSearching(true);
      setSearchError('');
      searchIfctFoods(query, { signal: controller.signal })
        .then((data) => {
          setFoods(data.foods ?? []);
          setResultQuery(query);
        })
        .catch((error) => {
          if (!controller.signal.aborted) {
            setResultQuery(query);
            setSearchError(error.message || 'Food search failed.');
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [foodModalOpen, search]);

  const target = today.calorieComparison?.target ?? null;
  const consumed = today.totals?.calories ?? 0;
  const comparisons = today.micronutrients?.rdaComparison ?? emptyComparisons;
  const visibleFoods = resultQuery === search.trim() ? foods : [];
  const warnings = useMemo(() => micronutrientDefinitions.flatMap((definition) => {
    const item = comparisons.find((row) => row.nutrient === definition.nutrient);
    if (!item || item.consumed == null || !(item.rda > 0) || item.consumed / item.rda >= 0.5) return [];
    return [{ ...definition, percent: Math.round((item.consumed / item.rda) * 100) }];
  }), [comparisons]);

  const handleAddFood = async (event) => {
    event.preventDefault();
    if (!selectedFood || Number(grams) < 1) return;
    const quantityGrams = Number(grams);
    const scale = quantityGrams / 100;
    const estimated = Object.fromEntries(
      ['calories', 'protein', 'carbs', 'fat'].map((key) => [key, round((selectedFood.nutrients[key] ?? 0) * scale)]),
    );
    const temporaryId = `pending-${Date.now()}`;
    const optimisticMeal = {
      _id: temporaryId,
      mealType,
      ifctCode: selectedFood.ifctCode,
      foodName: selectedFood.foodName,
      quantityGrams,
      ...estimated,
    };
    setToday((current) => ({
      ...current,
      meals: [...current.meals, optimisticMeal],
      totals: Object.fromEntries(['calories', 'protein', 'carbs', 'fat'].map((key) => [key, round((current.totals?.[key] ?? 0) + estimated[key])])),
    }));
    setSavingFood(true);
    setFoodError('');
    try {
      const response = await addFoodToLog({ mealType, ifctCode: selectedFood.ifctCode, quantityGrams });
      const savedMeal = response.meal ?? response;
      setToday((current) => ({ ...current, meals: current.meals.map((meal) => meal._id === temporaryId ? savedMeal : meal) }));
      setFoodModalOpen(false);
      setSelectedFood(null);
      setSearch('');
      setGrams('100');
    } catch (error) {
      setToday((current) => ({
        ...current,
        meals: current.meals.filter((meal) => meal._id !== temporaryId),
        totals: Object.fromEntries(['calories', 'protein', 'carbs', 'fat'].map((key) => [key, round(Math.max(0, (current.totals?.[key] ?? 0) - estimated[key]))])),
      }));
      setFoodError(error.message || 'Could not add this food. Please try again.');
    } finally {
      setSavingFood(false);
    }
  };

  const handleAddSupplement = async (event) => {
    event.preventDefault();
    setSavingSupplement(true);
    setSupplementError('');
    try {
      await addSupplementToLog({
        supplementName,
        vitamins: Object.fromEntries(Object.entries(vitamins).map(([key, value]) => [key, Number(value || 0)])),
      });
      await refresh();
      setSupplementModalOpen(false);
    } catch (error) {
      setSupplementError(error.message || 'Could not log this supplement.');
    } finally {
      setSavingSupplement(false);
    }
  };

  return (
    <section aria-labelledby="calorie-tracker-title" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-leaf dark:text-emerald-300">Daily nutrition</p>
          <h2 id="calorie-tracker-title" className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Calorie tracker</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Track meals, macros, and logged micronutrients for today.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => { setFoodError(''); setFoodModalOpen(true); }}>Add food</Button>
          <Button size="sm" variant="secondary" onClick={() => { setSupplementError(''); setSupplementModalOpen(true); }}>Log supplement</Button>
        </div>
      </div>

      {loadError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{loadError}</p>}
      {loading ? (
        <Card><p className="text-sm text-slate-500" role="status">Loading today’s nutrition…</p></Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card as="article" className="flex flex-col items-center justify-center gap-5 sm:flex-row sm:justify-start">
            <Ring consumed={consumed} target={target} />
            <div className="text-center sm:text-left">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Calories</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{target ? `${formatAmount(Math.max(0, target - consumed))} kcal remaining` : 'Complete your profile to calculate a daily target.'}</p>
              {target && consumed > target && <p className="mt-2 text-sm font-medium text-red-700 dark:text-red-300">You are {formatAmount(consumed - target)} kcal over your target.</p>}
            </div>
          </Card>
          <Card as="section" aria-labelledby="macro-title">
            <h3 id="macro-title" className="mb-5 text-lg font-semibold text-slate-900 dark:text-white">Macros</h3>
            <div className="space-y-5">
              {macroDefinitions.map(({ key, label, color }) => (
                <ProgressRow key={key} label={label} consumed={today.totals?.[key] ?? 0} target={macroTargets?.[key]} color={color} />
              ))}
            </div>
          </Card>

          <Card as="section" aria-labelledby="micronutrient-title">
            <h3 id="micronutrient-title" className="text-lg font-semibold text-slate-900 dark:text-white">Micronutrient progress</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Daily logged intake compared with project reference values.</p>
            <div className="mt-5 space-y-5">
              {comparisons.filter((item) => micronutrientDefinitions.some(({ nutrient }) => nutrient === item.nutrient)).map((item) => (
                <ProgressRow key={item.nutrient} label={item.nutrient} consumed={item.consumed ?? 0} target={item.rda} unit={item.unit} color={item.status === 'deficient' ? 'bg-amber-500' : 'bg-emerald-600'} />
              ))}
            </div>
            {warnings.length > 0 && (
              <ul className="mt-5 space-y-2" aria-label="Micronutrient suggestions">
                {warnings.map(({ nutrient, suggestion, percent }) => (
                  <li key={nutrient} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                    Your logged {nutrient} is below 50% of its reference ({percent}%). Suggest adding {suggestion}.
                  </li>
                ))}
              </ul>
            )}
            {comparisons.length === 0 && <p className="mt-4 text-sm text-slate-500">Micronutrient data is not available yet.</p>}
          </Card>

          <Card as="section" aria-labelledby="today-meals-title">
            <div className="flex items-center justify-between gap-3">
              <h3 id="today-meals-title" className="text-lg font-semibold text-slate-900 dark:text-white">Today’s food</h3>
              <span className="text-sm text-slate-500 dark:text-slate-400">{today.meals.length} {today.meals.length === 1 ? 'item' : 'items'}</span>
            </div>
            {today.meals.length ? (
              <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                {today.meals.map((meal) => (
                  <li key={meal._id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800 dark:text-slate-100">{meal.foodName}</p>
                      <p className="text-xs capitalize text-slate-500 dark:text-slate-400">{meal.mealType} · {meal.quantityGrams} g</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-slate-700 dark:text-slate-200">{formatAmount(meal.calories)} kcal</span>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No food logged yet today.</p>}
            {today.supplements.length > 0 && (
              <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Supplements</h4>
                <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                  {today.supplements.map((supplement) => <li key={supplement.id}>{supplement.supplementName}</li>)}
                </ul>
              </div>
            )}
          </Card>
        </div>
      )}

      <Modal isOpen={foodModalOpen} onClose={() => setFoodModalOpen(false)} title="Add food">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="ifct-food-search">Search IFCT foods</label>
          <input id="ifct-food-search" value={search} onChange={(event) => { setSearch(event.target.value); setSelectedFood(null); }} placeholder="Try rice, lentils, spinach…" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          <div className="max-h-52 space-y-2 overflow-y-auto" aria-live="polite">
            {searching && search.trim().length >= 2 && <p className="text-sm text-slate-500">Searching IFCT…</p>}
            {searchError && resultQuery === search.trim() && <p role="alert" className="text-sm text-red-700">{searchError}</p>}
            {!searching && search.trim().length >= 2 && resultQuery === search.trim() && visibleFoods.length === 0 && !searchError && <p className="text-sm text-slate-500">No matching foods found.</p>}
            {visibleFoods.map((food) => (
              <button type="button" key={food.ifctCode} onClick={() => setSelectedFood(food)} className={`flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left ${selectedFood?.ifctCode === food.ifctCode ? 'border-leaf bg-emerald-50 dark:bg-emerald-950/30' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}>
                <span className="min-w-0"><span className="block truncate font-medium text-slate-800 dark:text-slate-100">{food.foodName}</span><span className="text-xs text-slate-500">{food.ifctCode}</span></span>
                <span className="shrink-0 text-xs text-slate-500">{formatAmount(food.nutrients.calories)} kcal / 100 g</span>
              </button>
            ))}
          </div>
          {selectedFood && (
            <form className="space-y-4 border-t border-slate-100 pt-4 dark:border-slate-800" onSubmit={handleAddFood}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Amount (grams)
                  <input type="number" min="1" max="2000" step="1" required value={grams} onChange={(event) => setGrams(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                </label>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Meal
                  <select value={mealType} onChange={(event) => setMealType(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                    {['breakfast', 'lunch', 'dinner', 'snack'].map((meal) => <option key={meal} value={meal}>{meal[0].toUpperCase() + meal.slice(1)}</option>)}
                  </select>
                </label>
              </div>
              {foodError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{foodError}</p>}
              <Button type="submit" loading={savingFood} disabled={Number(grams) < 1 || Number(grams) > 2000} className="w-full">{savingFood ? 'Adding…' : 'Add to today'}</Button>
            </form>
          )}
        </div>
      </Modal>

      <Modal isOpen={supplementModalOpen} onClose={() => setSupplementModalOpen(false)} title="Log supplement">
        <form className="space-y-4" onSubmit={handleAddSupplement}>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Supplement name
            <input list="supplement-presets" required maxLength="120" value={supplementName} onChange={(event) => {
              const value = event.target.value;
              setSupplementName(value);
              if (value === 'Vitamin D3 60k IU') setVitamins((current) => ({ ...current, vitaminD: '60000' }));
              else if (value !== 'Vitamin D3 60k IU') setVitamins((current) => ({ ...current, vitaminD: '0' }));
            }} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            <datalist id="supplement-presets"><option value="Multivitamin" /><option value="Vitamin D3 60k IU" /><option value="Iron" /></datalist>
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400">Enter the amount shown on your supplement label. Units: vitamin D IU, B12 µg, iron and calcium mg.</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['vitaminD', 'Vitamin D (IU)'], ['b12', 'B12 (µg)'], ['iron', 'Iron (mg)'], ['calcium', 'Calcium (mg)'],
            ].map(([key, label]) => <label key={key} className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}<input type="number" min="0" step="any" value={vitamins[key]} onChange={(event) => setVitamins((current) => ({ ...current, [key]: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white" /></label>)}
          </div>
          {supplementError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{supplementError}</p>}
          <Button type="submit" loading={savingSupplement} className="w-full">{savingSupplement ? 'Saving…' : 'Save supplement'}</Button>
        </form>
      </Modal>
    </section>
  );
}
