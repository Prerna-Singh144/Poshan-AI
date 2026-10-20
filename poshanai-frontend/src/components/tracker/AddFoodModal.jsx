import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { getApiError } from '../../api/client.js';
import { searchFoods } from '../../api/foodLogApi.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { MAX_GRAMS, MIN_GRAMS, formatAmount, scaleNutrients } from '../../utils/nutrition.js';
import { Button, Input, Modal, Skeleton } from '../common/index.js';

const QUICK_AMOUNTS = [50, 100, 150, 200];
const gramsSchema = z
  .number({ invalid_type_error: `Enter an amount between ${MIN_GRAMS} and ${MAX_GRAMS} g.` })
  .min(MIN_GRAMS, `Enter an amount between ${MIN_GRAMS} and ${MAX_GRAMS} g.`)
  .max(MAX_GRAMS, `Enter an amount between ${MIN_GRAMS} and ${MAX_GRAMS} g.`);

function MacroPreview({ nutrients }) {
  return (
    <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-slate-700 dark:bg-emerald-950/40 dark:text-slate-200" aria-live="polite">
      <strong className="text-slate-900 dark:text-white">{formatAmount(nutrients.calories)} kcal</strong>
      {' · '}Protein {formatAmount(nutrients.protein)} g · Carbs {formatAmount(nutrients.carbs)} g · Fat {formatAmount(nutrients.fat)} g
    </p>
  );
}

function AddFoodForm({ onAdd, onClose }) {
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [gramsText, setGramsText] = useState('100');
  const [gramsError, setGramsError] = useState('');
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState({ key: '', foods: [], message: '' });

  const debouncedQuery = useDebounce(query, 300);
  const term = debouncedQuery.trim();
  const searchKey = `${term}|${retry}`;
  const isSearchable = term.length >= 2 && !selected;

  // The modal focuses its first control on open; move focus to the search box afterwards.
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isSearchable) return undefined;
    const controller = new AbortController();
    searchFoods(term, { signal: controller.signal })
      .then((foods) => setSearch({ key: searchKey, foods, message: '' }))
      .catch((error) => {
        if (controller.signal.aborted || error.name === 'CanceledError') return;
        setSearch({ key: searchKey, foods: null, message: getApiError(error) });
      });
    return () => controller.abort();
  }, [isSearchable, term, searchKey]);

  const current = search.key === searchKey ? search : null;
  const isLoading = isSearchable && (query.trim() !== term || !current);
  const grams = Number(gramsText);
  const parsed = gramsSchema.safeParse(gramsText.trim() === '' ? Number.NaN : grams);
  const preview = selected && parsed.success ? scaleNutrients(selected.nutrients, grams) : null;

  const choose = (food) => {
    setSelected(food);
    setGramsError('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!selected) return;
    if (!parsed.success) {
      setGramsError(parsed.error.issues[0].message);
      return;
    }
    onAdd({ food: selected, grams });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {!selected ? (
        <>
          <Input
            ref={inputRef}
            label="Search IFCT foods"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. rice, dal, paneer"
            autoComplete="off"
            maxLength={60}
            helperText="Values are per 100 g from the IFCT database, mostly raw ingredients."
          />
          <div aria-live="polite" className="min-h-[3rem]">
            {isLoading && (
              <div role="status" aria-label="Searching foods" className="space-y-2">
                <Skeleton height="12" />
                <Skeleton height="12" />
              </div>
            )}
            {isSearchable && !isLoading && current?.message && (
              <div role="alert" className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                <p>We could not search foods right now. {current.message}</p>
                <Button variant="ghost" size="sm" onClick={() => setRetry((value) => value + 1)}>Try again</Button>
              </div>
            )}
            {isSearchable && !isLoading && current?.foods?.length === 0 && (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                No foods found for “{term}”. Try a simpler word, such as “rice”.
              </p>
            )}
            {!isSearchable && !selected && term.length < 2 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">Type at least 2 letters to search.</p>
            )}
            {isSearchable && !isLoading && current?.foods?.length > 0 && (
              <ul className="max-h-[40vh] space-y-2 overflow-y-auto pr-1">
                {current.foods.map((food) => (
                  <li key={food.ifctCode}>
                    <button
                      type="button"
                      onClick={() => choose(food)}
                      className="flex min-h-[3.5rem] w-full flex-col items-start rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-leaf hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-emerald-950/40"
                    >
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{food.foodName}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {food.category} · {formatAmount(food.nutrients.calories)} kcal / 100 g
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{selected.foodName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formatAmount(selected.nutrients.calories)} kcal / 100 g
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Change</Button>
          </div>
          <div>
            <Input
              label="Amount (grams)"
              type="number"
              inputMode="decimal"
              min={MIN_GRAMS}
              max={MAX_GRAMS}
              step="any"
              value={gramsText}
              onChange={(event) => {
                setGramsText(event.target.value);
                setGramsError('');
              }}
              error={gramsError}
              autoFocus
            />
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Quick amounts">
              {QUICK_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => {
                    setGramsText(String(amount));
                    setGramsError('');
                  }}
                  className="min-h-[2.75rem] rounded-full border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {amount} g
                </button>
              ))}
            </div>
            {preview && <MacroPreview nutrients={preview} />}
          </div>
        </>
      )}
      <div className="flex gap-3 pt-1">
        <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button type="submit" className="flex-1" disabled={!selected}>Add to today</Button>
      </div>
    </form>
  );
}

export default function AddFoodModal({ isOpen, onClose, onAdd }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add food">
      <AddFoodForm onAdd={onAdd} onClose={onClose} />
    </Modal>
  );
}
