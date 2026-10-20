import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate } from 'framer-motion';
import { Apple, Dumbbell, Flame, Info, Pill, Utensils } from 'lucide-react';
import client from '../../api/client.js';
import {
  addFoodToLog,
  addSupplementToLog,
  getTodayLog,
  parseSmartLog,
  searchIfctFoods,
} from '../../api/dailyLogApi.js';
import { Button, Card, Modal } from '../common/index.js';
import SmoothInput from '../ui/SmoothInput.jsx';

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
const micronutrientGuidance = {
  vitaminA: { info: 'Supports vision, immune function, and healthy skin.', suggestion: 'carrots, sweet potato, or spinach' },
  vitaminC: { info: 'Helps make collagen and supports iron absorption.', suggestion: 'amla, guava, or citrus fruit' },
  vitaminD: { info: 'Helps the body absorb calcium and supports bones.', suggestion: 'fortified milk, eggs, or UV-exposed mushrooms' },
  vitaminE: { info: 'Helps protect cells from oxidative damage.', suggestion: 'almonds, sunflower seeds, or peanuts' },
  vitaminK: { info: 'Supports normal blood clotting and bone health.', suggestion: 'spinach, cabbage, or broccoli' },
  vitaminB1: { info: 'Helps release energy from food and supports nerve function.', suggestion: 'whole grains, lentils, or beans' },
  vitaminB2: { info: 'Helps release energy from food and supports cell growth.', suggestion: 'milk, curd, or mushrooms' },
  vitaminB3: { info: 'Helps the body turn food into energy.', suggestion: 'peanuts, mushrooms, or whole grains' },
  vitaminB6: { info: 'Supports protein metabolism and red blood cell function.', suggestion: 'chickpeas, banana, or potatoes' },
  vitaminB9: { info: 'Supports DNA formation and red blood cell production.', suggestion: 'lentils, beans, or leafy greens' },
  vitaminB12: { info: 'Supports nerve function and red blood cell production.', suggestion: 'dairy, eggs, or B12-fortified foods' },
  iron: { info: 'Needed for oxygen transport in the blood.', suggestion: 'lentils, beans, or spinach with lemon' },
  calcium: { info: 'Supports bones, teeth, and muscle function.', suggestion: 'milk, curd, or ragi' },
  zinc: { info: 'Supports immune function, healing, and growth.', suggestion: 'chickpeas, pumpkin seeds, or dairy' },
  magnesium: { info: 'Supports muscle, nerve, and energy functions.', suggestion: 'nuts, seeds, or whole grains' },
  potassium: { info: 'Supports fluid balance and normal muscle function.', suggestion: 'banana, potatoes, or beans' },
};

function formatAmount(value) {
  return Number.isFinite(Number(value)) ? round(Number(value)).toLocaleString() : '—';
}

function CountUp({ value }) {
  const outputRef = useRef(null);
  const number = Number(value) || 0;

  useLayoutEffect(() => {
    const controls = animate(0, number, {
      duration: 0.8,
      ease: 'easeOut',
      onUpdate: (latest) => {
        if (outputRef.current) outputRef.current.textContent = formatAmount(latest);
      },
    });
    return controls.stop;
  }, [number]);

  return <span ref={outputRef}>{formatAmount(0)}</span>;
}

function ProgressRow({ label, consumed, target, unit = 'g', color = 'bg-emerald-600', info, dataUnavailable = false }) {
  const hasValue = consumed !== null && consumed !== undefined;
  const percentage = target > 0 ? Math.min(100, Math.max(0, (consumed / target) * 100)) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
          {label}
          {info && (
            <span className="group relative inline-flex">
              <button type="button" title={info} aria-label={`${label}: ${info}`} className="rounded-full text-slate-400 hover:text-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf">
                <Info size={14} aria-hidden="true" />
              </button>
            </span>
          )}
        </span>
        <span className="text-slate-500 dark:text-slate-400">
          {hasValue ? <><CountUp value={consumed} /> / </> : `${dataUnavailable ? 'Not tracked yet' : 'Data unavailable'} / `}{target ? <><CountUp value={target} /> {unit}</> : 'target unavailable'}
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
  const color = ratio > 0.9 ? '#dc4b35' : ratio >= 0.5 ? '#e58a27' : '#397a55';
  const shadowColor = ratio > 0.9 ? 'rgba(220, 75, 53, 0.28)' : ratio >= 0.5 ? 'rgba(229, 138, 39, 0.28)' : 'rgba(57, 122, 85, 0.28)';
  const progress = Math.min(Math.max(ratio * 100, 0), 100);
  return (
    <div
      className="relative grid h-48 w-48 shrink-0 place-items-center rounded-full"
      role="img"
      aria-label={`${formatAmount(consumed)} of ${target ? formatAmount(target) : 'unknown'} calories`}
    >
      <svg className="absolute inset-0 h-full w-full -rotate-90 overflow-visible" viewBox="0 0 160 160" aria-hidden="true">
        <circle cx="80" cy="80" r="69" fill="none" strokeWidth="11" className="stroke-slate-200 dark:stroke-slate-700" />
        <circle
          cx="80" cy="80" r="69" fill="none" stroke={color} strokeWidth="11" strokeLinecap="round"
          pathLength="100" strokeDasharray={`${progress} 100`}
          className="transition-[stroke-dasharray,stroke] duration-700 ease-out"
          style={{ filter: `drop-shadow(0 3px 6px ${shadowColor})` }}
        />
      </svg>
      <div className="relative grid h-40 w-40 content-center justify-items-center rounded-full bg-white/80 dark:bg-slate-900/80">
        <span className="mb-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 text-orange-600 dark:bg-orange-400/10 dark:text-orange-300"><Flame size={18} strokeWidth={2.2} /></span>
        <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white"><CountUp value={consumed} /></span>
        <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">of {target ? <><CountUp value={target} /> kcal</> : 'target unavailable'}</span>
        <span className="mt-2 text-xs font-bold" style={{ color }}><CountUp value={percentage} />%</span>
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
  const [smartText, setSmartText] = useState('');
  const [smartLogError, setSmartLogError] = useState('');
  const [parsingSmartLog, setParsingSmartLog] = useState(false);
  const [smartItems, setSmartItems] = useState([]);
  const [savingSmartItems, setSavingSmartItems] = useState(false);
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

  const handleSmartParse = async (event) => {
    event.preventDefault();
    if (smartText.trim().length < 3) return;
    setParsingSmartLog(true);
    setSmartLogError('');
    try {
      const result = await parseSmartLog(smartText.trim());
      if (!result.items?.length) {
        setSmartLogError('No foods could be matched. Try naming the foods and portions more clearly.');
        return;
      }
      setSmartItems(result.items);
      setSelectedFood(null);
      setSearch('');
      setFoodError('');
      setFoodModalOpen(true);
    } catch (error) {
      setSmartLogError(error.message || 'Could not parse this meal. Please try again.');
    } finally {
      setParsingSmartLog(false);
    }
  };

  const handleConfirmSmartLog = async () => {
    if (smartItems.length === 0) return;
    setSavingSmartItems(true);
    setFoodError('');
    let savedCount = 0;
    try {
      for (const item of smartItems) {
        await addFoodToLog({
          mealType: item.mealType,
          ifctCode: item.ifctCode,
          quantityGrams: item.quantityGrams,
        });
        savedCount += 1;
      }
      setSmartItems([]);
      setFoodModalOpen(false);
      setSmartText('');
    } catch (error) {
      if (savedCount > 0) {
        setSmartItems((items) => items.slice(savedCount));
        try {
          await refresh();
        } catch {
          // Keep the remaining items available so they can be retried.
        }
      }
      setFoodError(savedCount > 0
        ? `${savedCount} item${savedCount === 1 ? '' : 's'} saved. The remaining items were not added. ${error.message}`
        : (error.message || 'Could not add these foods. Please try again.'));
      return;
    } finally {
      setSavingSmartItems(false);
    }
    try {
      await refresh();
    } catch (error) {
      setLoadError(error.message || 'Foods were added, but today’s log could not be refreshed.');
    }
  };

  const handleAddSupplement = async (event) => {
    event.preventDefault();
    const vitaminsToAdd = Object.fromEntries(Object.entries(vitamins).map(([key, value]) => [key, Number(value || 0)]));
    const temporaryId = `pending-supplement-${Date.now()}`;
    const optimisticSupplement = { id: temporaryId, supplementName, vitamins: vitaminsToAdd, pending: true };
    setToday((current) => ({ ...current, supplements: [...current.supplements, optimisticSupplement] }));
    setSavingSupplement(true);
    setSupplementError('');
    let saved = false;
    try {
      await addSupplementToLog({ supplementName, vitamins: vitaminsToAdd });
      saved = true;
      setSupplementModalOpen(false);
      try {
        await refresh();
      } catch (error) {
        setLoadError(error.message || 'The supplement was saved, but today’s log could not be refreshed.');
      }
    } catch (error) {
      if (!saved) setToday((current) => ({ ...current, supplements: current.supplements.filter((item) => item.id !== temporaryId) }));
      setSupplementError(error.message || 'Could not log this supplement.');
    } finally {
      setSavingSupplement(false);
    }
  };

  return (
    <section aria-labelledby="calorie-tracker-title" className="space-y-5">
      <div className="space-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-leaf dark:text-emerald-300">Your daily balance</p>
          <h2 id="calorie-tracker-title" className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Nutrition at a glance</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">A thoughtful look at what you’ve nourished your body with today.</p>
        </div>
        <form onSubmit={handleSmartParse} className="max-w-2xl space-y-2">
          <label htmlFor="smart-food-text" className="block text-sm font-semibold text-slate-800 dark:text-slate-100">Smart Log</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input id="smart-food-text" value={smartText} onChange={(event) => setSmartText(event.target.value)} placeholder="What did you eat? (e.g., 2 rotis and dal)" maxLength={2000} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none placeholder:text-slate-400 focus:border-leaf focus:ring-2 focus:ring-leaf/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
            <Button type="submit" size="sm" loading={parsingSmartLog} disabled={smartText.trim().length < 3}>{parsingSmartLog ? 'Parsing…' : 'Review foods'}</Button>
          </div>
          {smartLogError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{smartLogError}</p>}
        </form>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="shadow-sm" onClick={() => { setSmartItems([]); setFoodError(''); setFoodModalOpen(true); }}><Utensils size={16} /> Add food</Button>
          <Button size="sm" variant="secondary" onClick={() => { setSupplementError(''); setSupplementModalOpen(true); }}><Pill size={16} /> Log supplement</Button>
        </div>
      </div>

      {loadError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{loadError}</p>}
      {loading ? (
        <Card><p className="text-sm text-slate-500" role="status">Loading today’s nutrition…</p></Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card as="article" className="flex flex-col items-center justify-center gap-5 bg-gradient-to-br from-white to-slate-50 shadow-md dark:from-slate-900 dark:to-slate-950 sm:flex-row sm:justify-start">
            <Ring consumed={consumed} target={target} />
            <div className="text-center sm:text-left">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300"><Flame size={14} /> Calories today</span>
              <h3 className="mt-3 text-xl font-bold tracking-tight text-slate-900 dark:text-white">A little progress, every day</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{target ? <><CountUp value={Math.max(0, target - consumed)} /> kcal left in your daily target</> : 'Complete your profile to calculate a daily target.'}</p>
              {target && consumed > target && <p className="mt-2 text-sm font-medium text-red-700 dark:text-red-300">You are {formatAmount(consumed - target)} kcal over your target.</p>}
            </div>
          </Card>
          <Card as="section" aria-labelledby="macro-title" className="bg-gradient-to-br from-white to-slate-50 transition duration-200 hover:scale-[1.01] hover:shadow-md dark:from-slate-900 dark:to-slate-950">
            <h3 id="macro-title" className="mb-5 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white"><span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300"><Dumbbell size={18} /></span>Macros</h3>
            <div className="space-y-5">
              {macroDefinitions.map(({ key, label, color }) => (
                <ProgressRow key={key} label={label} consumed={today.totals?.[key] ?? 0} target={macroTargets?.[key]} color={color} />
              ))}
            </div>
          </Card>

          <Card as="section" aria-labelledby="micronutrient-title" className="bg-gradient-to-br from-white to-slate-50 transition duration-200 hover:scale-[1.01] hover:shadow-md dark:from-slate-900 dark:to-slate-950">
            <h3 id="micronutrient-title" className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300"><Pill size={18} /></span>Micronutrient progress</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Daily logged intake compared with your reference. Select an info icon to learn what each nutrient does.</p>
            <div className="mt-5 max-h-[34rem] space-y-5 overflow-y-auto pr-2" aria-label="Micronutrient progress list">
              {comparisons.map((item) => {
                const guidance = micronutrientGuidance[item.key] ?? {};
                const percent = item.progressPercent != null && Number.isFinite(Number(item.progressPercent))
                  ? Number(item.progressPercent)
                  : item.consumed != null && item.rda > 0
                    ? (Number(item.consumed) / Number(item.rda)) * 100
                    : null;
                const belowHalf = item.consumed != null && percent != null && percent < 50;
                return (
                  <div key={item.key ?? item.nutrient} className="space-y-2">
                    <ProgressRow
                      label={item.nutrient}
                      consumed={item.consumed}
                      target={item.rda}
                      unit={item.unit}
                      info={guidance.info ?? 'An essential nutrient that supports normal body functions.'}
                      dataUnavailable={item.dataUnavailable}
                      color={belowHalf ? 'bg-amber-500' : 'bg-emerald-600'}
                    />
                    {belowHalf && guidance.suggestion && (
                      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                        Below 50% today. Try adding {guidance.suggestion} to a meal.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {comparisons.length === 0 && <p className="mt-4 text-sm text-slate-500">Micronutrient data is not available yet.</p>}
          </Card>

          <Card as="section" aria-labelledby="today-meals-title" className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
            <div className="flex items-center justify-between gap-3">
              <h3 id="today-meals-title" className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white"><span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-50 text-orange-700 dark:bg-orange-400/10 dark:text-orange-300"><Apple size={18} /></span>Today’s food</h3>
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

      <Modal isOpen={foodModalOpen} onClose={() => { setFoodModalOpen(false); setSmartItems([]); }} title={smartItems.length ? 'Review smart log' : 'Add food'}>
        {smartItems.length ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">Check the foods, portions, and IFCT-based estimates before adding them to today’s log.</p>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
              {smartItems.map((item, index) => (
                <li key={`${item.ifctCode}-${index}`} className="flex items-start justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white">{item.foodName}</p>
                    <p className="text-xs capitalize text-slate-500 dark:text-slate-400">{item.mealType} · {item.quantityGrams} g · {item.ifctCode}</p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-slate-600 dark:text-slate-300">
                    <p className="font-semibold">{formatAmount(item.calories)} kcal</p>
                    <p>P {formatAmount(item.protein)} · C {formatAmount(item.carbs)} · F {formatAmount(item.fat)} g</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100">
              <p className="font-semibold">Estimated total: {formatAmount(smartItems.reduce((sum, item) => sum + item.calories, 0))} kcal</p>
              <p className="mt-1">Protein {formatAmount(smartItems.reduce((sum, item) => sum + item.protein, 0))} g · Carbs {formatAmount(smartItems.reduce((sum, item) => sum + item.carbs, 0))} g · Fat {formatAmount(smartItems.reduce((sum, item) => sum + item.fat, 0))} g</p>
            </div>
            {foodError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{foodError}</p>}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => { setSmartItems([]); setFoodModalOpen(false); }} disabled={savingSmartItems}>Cancel</Button>
              <Button className="flex-1" onClick={handleConfirmSmartLog} loading={savingSmartItems}>{savingSmartItems ? 'Adding foods…' : 'Confirm & add foods'}</Button>
            </div>
          </div>
        ) : (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="ifct-food-search">Search IFCT foods</label>
          <SmoothInput id="ifct-food-search" value={search} onChange={(event) => { setSearch(event.target.value); setSelectedFood(null); }} placeholder="Try rice, lentils, spinach…" />
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
        )}
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
