import { useId } from 'react';
import { Button as RetroButton, Input as RetroInput } from 'pixel-retroui';

const legendClass = 'mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-100';
const focusRing =
  'peer-focus-visible:ring-2 peer-focus-visible:ring-leaf peer-focus-visible:ring-offset-2 dark:peer-focus-visible:ring-offset-slate-900';

function FieldError({ id, error }) {
  if (!error) return null;
  return (
    <p id={id} role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
      {error}
    </p>
  );
}

/** Single choice, rendered as large tappable cards (native radios, keyboard friendly). */
export function ChoiceGrid({ legend, name, options, value, onChange, error }) {
  const errorId = useId();
  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className={legendClass}>{legend}</legend>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option.value} className="relative block cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span
              className={`flex min-h-[3.75rem] items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition active:scale-[0.99] peer-checked:border-leaf peer-checked:bg-emerald-50 peer-checked:ring-2 peer-checked:ring-leaf/30 dark:border-slate-700 dark:bg-slate-900 dark:peer-checked:bg-emerald-950/40 ${focusRing}`}
            >
              <span aria-hidden="true" className="text-2xl leading-none">{option.emoji}</span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900 dark:text-white">{option.label}</span>
                {option.hint && (
                  <span className="block text-xs text-slate-500 dark:text-slate-400">{option.hint}</span>
                )}
              </span>
            </span>
          </label>
        ))}
      </div>
      <FieldError id={errorId} error={error} />
    </fieldset>
  );
}

/** Multi choice chips (native checkboxes). */
export function ChipGroup({ legend, hint, options, selected, onToggle, error }) {
  const errorId = useId();
  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className={legendClass}>{legend}</legend>
      {hint && <p className="-mt-1 mb-2 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.value} className="relative cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={() => onToggle(option.value)}
              className="peer sr-only"
            />
            <span
              className={`inline-flex min-h-[2.75rem] items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition active:scale-[0.97] peer-checked:border-leaf peer-checked:bg-leaf peer-checked:text-white dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 ${focusRing}`}
            >
              {option.label}
            </span>
          </label>
        ))}
      </div>
      <FieldError id={errorId} error={error} />
    </fieldset>
  );
}

export function Stepper({ legend, value, min, max, onChange, unit }) {
  return (
    <div role="group" aria-label={legend}>
      <p className={legendClass}>{legend}</p>
      <div className="flex items-center gap-4">
        <RetroButton
          type="button"
          bg="#1E5631"
          textColor="#FFFFFF"
          borderColor="#000000"
          shadow="#000000"
          className="mx-0 my-0 h-11 w-11 px-2 py-1 text-xl disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Decrease ${legend}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          −
        </RetroButton>
        <div className="flex min-w-32 items-center gap-2">
          <RetroInput
            aria-label={legend}
            type="number"
            min={min}
            max={max}
            step={1}
            value={value}
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              if (Number.isFinite(nextValue)) onChange(Math.min(max, Math.max(min, nextValue)));
            }}
            bg="#FFFFFF"
            textColor="#1E5631"
            borderColor="#000000"
            className="w-20"
          />
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{unit}</span>
        </div>
        <RetroButton
          type="button"
          bg="#1E5631"
          textColor="#FFFFFF"
          borderColor="#000000"
          shadow="#000000"
          className="mx-0 my-0 h-11 w-11 px-2 py-1 text-xl disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Increase ${legend}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          +
        </RetroButton>
      </div>
    </div>
  );
}

export function RangeField({ legend, value, min, max, step, onChange, unit }) {
  const id = useId();
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-slate-800 dark:text-slate-100">{legend}</label>
        <output htmlFor={id} className="text-lg font-bold tabular-nums text-leaf dark:text-emerald-300">
          {value} <span className="text-sm font-medium text-slate-500">{unit}</span>
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-valuetext={`${value} ${unit}`}
        className="h-11 w-full cursor-pointer accent-leaf"
      />
      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400" aria-hidden="true">
        <span>{min} {unit}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  );
}

export function ConsentCheckbox({ checked, onChange, error }) {
  const errorId = useId();
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-describedby={error ? errorId : undefined}
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-leaf"
        />
        <span className="text-sm text-slate-700 dark:text-slate-200">
          I agree that PoshanAI may store and use these answers to suggest blood tests. This is for
          awareness and is not medical advice.
        </span>
      </label>
      <FieldError id={errorId} error={error} />
    </div>
  );
}
