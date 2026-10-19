// Reference daily targets for a 2,000 kcal diet (calories from the product brief; protein, carbs and
// fat follow the FDA Daily Values for a 2,000 kcal diet). General reference values, not personalised
// advice: have a dietitian review them, and prefer targets from the API when they exist.
export const DEFAULT_TARGETS = Object.freeze({ calories: 2000, protein: 50, carbs: 275, fat: 78 });

// From this share of the target upwards a bar is "near limit"; above 100% it is "over limit".
export const NEAR_LIMIT_RATIO = 0.9;

export const MIN_GRAMS = 1;
export const MAX_GRAMS = 2000;

// Brand colours: Forest Green #1E5631, Accent Orange #F57C00, plus a red for "over limit".
// Dark-mode shades are lighter so they stay visible on dark surfaces; labels use darker/lighter
// text shades to keep contrast. Full class strings so Tailwind can find them.
export const STATUS = {
  ok: {
    key: 'ok',
    label: 'On track',
    glyph: '✓',
    stroke: 'stroke-[#1E5631] dark:stroke-[#4ADE80]',
    bar: 'bg-[#1E5631] dark:bg-[#4ADE80]',
    text: 'text-[#1E5631] dark:text-[#4ADE80]',
    pill: 'bg-[#1E5631]/10 text-[#1E5631] dark:bg-[#4ADE80]/15 dark:text-[#4ADE80]',
  },
  near: {
    key: 'near',
    label: 'Near limit',
    glyph: '!',
    stroke: 'stroke-[#F57C00] dark:stroke-[#FFA040]',
    bar: 'bg-[#F57C00] dark:bg-[#FFA040]',
    text: 'text-[#A85500] dark:text-[#FFB366]',
    pill: 'bg-[#F57C00]/15 text-[#A85500] dark:bg-[#FFA040]/15 dark:text-[#FFB366]',
  },
  over: {
    key: 'over',
    label: 'Over limit',
    glyph: '▲',
    stroke: 'stroke-[#C62828] dark:stroke-[#F87171]',
    bar: 'bg-[#C62828] dark:bg-[#F87171]',
    text: 'text-[#C62828] dark:text-[#FCA5A5]',
    pill: 'bg-[#C62828]/10 text-[#C62828] dark:bg-[#F87171]/15 dark:text-[#FCA5A5]',
  },
};

export function getStatus(consumed, target) {
  const ratio = target > 0 ? consumed / target : 0;
  if (ratio > 1) return STATUS.over;
  if (ratio >= NEAR_LIMIT_RATIO) return STATUS.near;
  return STATUS.ok;
}

const round1 = (value) => Math.round(value * 10) / 10;

/** Scales per-100 g macros to a portion (same maths as the server, used for optimistic updates). */
export function scaleNutrients(per100g, grams) {
  const factor = grams / 100;
  return {
    calories: round1((per100g.calories ?? 0) * factor),
    protein: round1((per100g.protein ?? 0) * factor),
    carbs: round1((per100g.carbs ?? 0) * factor),
    fat: round1((per100g.fat ?? 0) * factor),
  };
}

export function sumNutrients(entries) {
  const totals = entries.reduce(
    (sum, entry) => ({
      calories: sum.calories + (entry.calories ?? 0),
      protein: sum.protein + (entry.protein ?? 0),
      carbs: sum.carbs + (entry.carbs ?? 0),
      fat: sum.fat + (entry.fat ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  return {
    calories: round1(totals.calories),
    protein: round1(totals.protein),
    carbs: round1(totals.carbs),
    fat: round1(totals.fat),
  };
}

/** Local calendar day as YYYY-MM-DD (not UTC), matching what the API stores. */
export function todayDateString(now = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export const formatAmount = (value) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);
