import { useCallback, useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks.js';
import { addFoodEntry, fetchTodayLog, selectFoodLog, selectTotals } from '../store/slices/foodLogSlice.js';
import { Button, Card, Skeleton, useToast } from '../components/common/index.js';
import AddFoodModal from '../components/tracker/AddFoodModal.jsx';
import CalorieRing from '../components/tracker/CalorieRing.jsx';
import FoodLogList from '../components/tracker/FoodLogList.jsx';
import MacroBar from '../components/tracker/MacroBar.jsx';
import { DEFAULT_TARGETS, todayDateString } from '../utils/nutrition.js';

const longDate = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

function TrackerSkeleton() {
  return (
    <div role="status" aria-label="Loading your food log" className="mt-6 space-y-4">
      <Card className="flex flex-col items-center gap-4">
        <Skeleton width="48" height="32" rounded="full" className="h-48 w-48" />
        <Skeleton width="40" height="6" />
      </Card>
      <Card className="space-y-4">
        {[0, 1, 2].map((key) => (
          <div key={key} className="space-y-2">
            <Skeleton width="third" height="4" />
            <Skeleton height="3" />
          </div>
        ))}
      </Card>
    </div>
  );
}

export default function CalorieTracker() {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { entries, status } = useAppSelector(selectFoodLog);
  const totals = useAppSelector(selectTotals);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);

  const loadTodayLog = useCallback(async () => {
    try {
      await dispatch(fetchTodayLog(todayDateString())).unwrap();
    } catch {
      // Keep request details and potentially sensitive server errors out of browser logs.
      console.error('Daily log request failed.');
      toast('Could not load daily logs. Please try again.', 'error');
    }
  }, [dispatch, toast]);

  useEffect(() => {
    void loadTodayLog();
  }, [loadTodayLog]);

  // Optimistic: the modal closes and the rings/bars update at once. If the server rejects the
  // entry the slice rolls it back and we tell the user.
  const handleAdd = ({ food, grams, quantity, measure }) => {
    setIsModalOpen(false);
    dispatch(addFoodEntry({ food, grams, quantity, measure, date: todayDateString() }))
      .unwrap()
      .catch((message) => toast(`Could not add ${food.foodName}. ${message}`, 'error'));
  };

  const isEmpty = entries.length === 0;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-leaf dark:text-emerald-300">{longDate.format(new Date())}</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">Calorie tracker</h1>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setIsModalOpen(true)}>+ Add food</Button>
      </header>

      {status === 'loading' || status === 'idle' ? <TrackerSkeleton /> : null}

      {status === 'error' && (
        <Card className="mt-6 text-center" role="alert">
          <p className="text-3xl" aria-hidden="true">⚠️</p>
          <p className="mt-2 font-semibold text-slate-900 dark:text-white">We could not load today’s log.</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Could not load daily logs. Please try again.</p>
          <Button className="mt-4" onClick={() => void loadTodayLog()}>Try again</Button>
        </Card>
      )}

      {status === 'ready' && (
        <div className="mt-6 space-y-4">
          <Card className="flex flex-col items-center py-6">
            <CalorieRing consumed={totals.calories} target={DEFAULT_TARGETS.calories} />
          </Card>

          <Card className="space-y-5">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Macros</h2>
            <MacroBar label="Protein" consumed={totals.protein} target={DEFAULT_TARGETS.protein} />
            <MacroBar label="Carbs" consumed={totals.carbs} target={DEFAULT_TARGETS.carbs} />
            <MacroBar label="Fat" consumed={totals.fat} target={DEFAULT_TARGETS.fat} />
          </Card>

          <Card>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Today’s foods</h2>
            {isEmpty ? (
              <div className="py-8 text-center">
                <p className="text-3xl" aria-hidden="true">🍽️</p>
                <p className="mt-2 font-semibold text-slate-900 dark:text-white">Nothing logged yet today</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Add your first food to see your calories and macros.</p>
                <Button className="mt-4" onClick={() => setIsModalOpen(true)}>+ Add food</Button>
              </div>
            ) : (
              <FoodLogList entries={entries.slice(0, visibleCount)} />
            )}
            {entries.length > visibleCount && <Button className="mt-4 w-full" variant="secondary" onClick={() => setVisibleCount((count) => count + 10)}>Load more foods</Button>}
          </Card>

          <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
            Targets are general reference values for a 2,000 kcal diet, not personal advice. Food values come from the
            IFCT database per 100 g. Talk to a doctor or dietitian about what is right for you.
          </p>
        </div>
      )}

      <AddFoodModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAdd={handleAdd} />
    </div>
  );
}
