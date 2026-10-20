import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { Apple, ArrowLeft, Egg, Wheat } from 'lucide-react';
import { getApiError } from '../../api/client.js';
import { searchFoods } from '../../api/foodLogApi.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { MAX_GRAMS, MIN_GRAMS, formatAmount, getDefaultFoodMeasure, getDefaultFoodQuantity, getFoodMeasures, getPortionNutrients, getServingGrams } from '../../utils/nutrition.js';
import { Button, Modal, Skeleton } from '../common/index.js';

const gramsSchema = z
  .number({ invalid_type_error: `Enter an amount between ${MIN_GRAMS} and ${MAX_GRAMS} g.` })
  .min(MIN_GRAMS, `Enter an amount between ${MIN_GRAMS} and ${MAX_GRAMS} g.`)
  .max(MAX_GRAMS, `Enter an amount between ${MIN_GRAMS} and ${MAX_GRAMS} g.`);

function MacroPreview({ nutrients }) {
  return (
    <section className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 dark:border-emerald-900 dark:bg-emerald-950/40" aria-live="polite" aria-label="Estimated nutrition">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-900 dark:text-white">Nutrition for this portion</h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">IFCT estimate</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[
          ['Calories', `${formatAmount(nutrients.calories)} kcal`],
          ['Protein', `${formatAmount(nutrients.protein)} g`],
          ['Carbs', `${formatAmount(nutrients.carbs)} g`],
          ['Fat', `${formatAmount(nutrients.fat)} g`],
          ['Fiber', nutrients.fiber == null ? 'Unavailable' : `${formatAmount(nutrients.fiber)} g`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-white/80 px-3 py-2 dark:bg-slate-900/70">
            <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
            <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function AddFoodForm({ onAdd, onClose }) {
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [quantityText, setQuantityText] = useState('100');
  const [measure, setMeasure] = useState('grams');
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
  const quantity = Number(quantityText);
  const measures = selected ? getFoodMeasures(selected) : [];
  const maxQuantity = measure === 'grams' ? MAX_GRAMS : 20;
  const grams = selected ? getServingGrams(selected, measure, quantity) : 0;
  const quantityIsValid = Number.isInteger(quantity) && quantity >= 1 && quantity <= maxQuantity;
  const parsed = gramsSchema.safeParse(grams);
  const preview = selected && quantityIsValid && parsed.success
    ? getPortionNutrients(selected, grams)
    : null;

  const choose = (food) => {
    setSelected(food);
    const defaultMeasure = getDefaultFoodMeasure(food);
    setMeasure(defaultMeasure);
    setQuantityText(String(getDefaultFoodQuantity(defaultMeasure)));
    setGramsError('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!selected) return;
    if (!quantityIsValid || !parsed.success) {
      setGramsError(!quantityIsValid ? `Choose a quantity from 1 to ${maxQuantity}.` : parsed.error.issues[0].message);
      return;
    }
    onAdd({ food: selected, grams, quantity, measure });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {!selected ? (
        <>
          <div>
            <label htmlFor="food-search" className="mb-1.5 block text-sm font-medium text-slate-800 dark:text-slate-100">Search IFCT foods</label>
            <input
              ref={inputRef}
              id="food-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. rice, dal, paneer"
              autoComplete="off"
              maxLength={60}
              className="w-full rounded-xl border border-green-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 dark:bg-slate-900 dark:text-white"
              aria-describedby="food-search-help"
            />
            <p id="food-search-help" className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Values are per 100 g from the IFCT database, mostly raw ingredients.</p>
          </div>
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
        <section className="space-y-4" aria-label="Food details">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => { setSelected(null); setGramsError(''); }} aria-label="Back to food search" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              <ArrowLeft size={18} aria-hidden="true" />
            </button>
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-green-100 to-emerald-200 text-green-800 dark:from-green-950 dark:to-emerald-900 dark:text-emerald-200" aria-hidden="true">
              {selected.foodName.toLowerCase().includes('egg') ? <Egg size={28} /> : selected.foodName.toLowerCase().includes('rice') ? <Wheat size={28} /> : <Apple size={28} />}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 dark:text-white">{selected.foodName}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{selected.category} · {formatAmount(selected.nutrients.calories)} kcal / 100 g</p>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_1.4fr] gap-3">
            <label className="text-sm font-medium text-slate-800 dark:text-slate-100" htmlFor="food-quantity">
              Quantity
              <input id="food-quantity" type="number" min="1" max={maxQuantity} step="1" value={quantityText} onChange={(event) => { setQuantityText(event.target.value); setGramsError(''); }} className="mt-1.5 w-full rounded-xl border border-green-200 bg-white px-3 py-3 text-slate-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 dark:bg-slate-900 dark:text-white" />
            </label>
            <label className="text-sm font-medium text-slate-800 dark:text-slate-100" htmlFor="food-measure">
              Measure
              <select id="food-measure" value={measure} onChange={(event) => { setMeasure(event.target.value); setGramsError(''); }} className="mt-1.5 w-full rounded-xl border border-green-200 bg-white px-3 py-3 capitalize text-slate-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 dark:bg-slate-900 dark:text-white">
                {measures.map(({ measure: option }) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{quantity} × {measure === 'grams' ? 'g' : measure} = <strong className="text-slate-700 dark:text-slate-200">{formatAmount(grams)} g</strong></p>

          {preview && <MacroPreview nutrients={preview} />}
          {(gramsError || !quantityIsValid || !parsed.success) && (
            <p role="alert" className="text-sm text-red-600">
              {gramsError || (!quantityIsValid ? `Choose a quantity from 1 to ${maxQuantity}.` : parsed.error.issues[0].message)}
            </p>
          )}
        </section>
      )}
      <div className="flex gap-3 pt-1">
        <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button type="submit" className="min-h-12 flex-1 rounded-xl bg-[#1E5631] text-base uppercase tracking-wide hover:bg-[#174425]" disabled={!selected || !quantityIsValid || !parsed.success}>ADD</Button>
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
