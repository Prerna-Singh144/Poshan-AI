const nutrientLabels = [
  {
    nutrient: 'Vitamin D',
    pattern: /(?<!vit(?:amin)?\s*d\s*)(?<!vitamin d\s*\()(?<!vit d\s*\()\b(?:25[-\s]?(?:oh|hydroxy)(?:[-\s]?(?:vit(?:amin)?\s*)?d)?|vit(?:amin)?\s*d(?:\s*3)?)\b|विटामिन\s*डी/i,
  },
  {
    nutrient: 'Vitamin B12',
    pattern: /\b(?:vitamin\s*b\s*12|vit\s*b\s*12|b\s*12|cobalamin|cyanocobalamin)\b|विटामिन\s*बी\s*12/i,
  },
  {
    nutrient: 'Iron',
    pattern: /(?<!tibc\s*)(?<!uibc\s*)\b(?:serum\s+)?iron\b(?!\s*[,-/(]?\s*(?:total\s+)?(?:binding\s+capacity|capacity|\(?tibc\)?|ferritin))|लोहा|आयरन/i,
  },
  {
    nutrient: 'Calcium',
    pattern: /(?<!\burine\s+)(?<!\burinary\s+)(?<!\bionized\s+)\b(?:serum\s+)?calcium\b(?!\s*[,-/(]?\s*(?:urine|urinary|ionized))|कैल्शियम/i,
  },
  {
    nutrient: 'Hemoglobin',
    pattern: /\b(?:hemoglobin|haemoglobin|hb)\b|हीमोग्लोबिन/i,
  },
];

function numericValue(rawValue) {
  if (typeof rawValue === 'number') return Number.isFinite(rawValue) ? rawValue : null;
  if (typeof rawValue !== 'string') return null;
  const normalized = rawValue.replace(/,/g, '').replace(/[<>≤≥=\s]/g, '');
  const value = parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

export function flagBiomarkerValue(value, referenceRange) {
  if (!referenceRange) return 'unknown';
  const range = referenceRange.match(
    /^\s*([<>≤≥]=?)?\s*((?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d+)?)(?:\s*[-–]\s*((?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d+)?))?\s*$/,
  );
  if (!range) return 'unknown';

  const operator = range[1];
  const lower = numericValue(range[2]);
  const upper = range[3] ? numericValue(range[3]) : null;
  if (lower === null || (range[3] && upper === null)) return 'unknown';
  if (operator === '<' || operator === '<=' || operator === '≤') {
    return value > lower ? 'high' : 'normal';
  }
  if (operator === '>' || operator === '>=' || operator === '≥') {
    return value < lower ? 'low' : 'normal';
  }
  if (upper === null) return 'unknown';
  if (value < lower) return 'low';
  if (value > upper) return 'high';
  return 'normal';
}

function cleanSegment(text) {
  return text
    .replace(/^\s*(?:\([^)]*\)\s*)+/i, ' ')
    .replace(/^\s*25[-\s]?oh\b/i, ' ')
    .replace(/^\s*(?:(?:result|value|observed\s+value)\s*[:\-=]?|[:\-=]+(?:\s*[:\-=]+)?)\s*/i, '')
    .trim();
}

function segmentAfterLabel(text, labelEnd, nextLabelStart, nutrient) {
  const end = Math.min(nextLabelStart ?? text.length, labelEnd + 240);
  const lines = text.slice(labelEnd, end).split(/\r?\n/).slice(0, 4);
  let segment = '';

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    if (/\b(?:pathlabs|apollo|srl|diagnostics|laborator(?:y|ies))\b/i.test(trimmedLine)) break;
    segment = `${segment} ${trimmedLine}`.trim();
    const parsed = parseValueSegment(segment, nutrient);
    if (parsed?.referenceRange) break;
  }

  return cleanSegment(segment);
}

function parseValueSegment(segment, nutrient) {
  const rangeMatch = segment.match(
    /(?:reference(?:\s+range|\s+interval)?\s*:?\s*)?([<>≤≥]=?\s*(?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d+)?|(?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d+)?\s*[-–]\s*(?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d+)?)(?:\s*[a-zA-Z%µμ/]+)?\s*$/i,
  );
  const referenceRange = rangeMatch?.[1]?.replace(/\s+/g, ' ').trim() ?? null;
  const resultText = rangeMatch ? segment.slice(0, rangeMatch.index) : segment;
  const cleaned = cleanSegment(resultText);
  const valueMatch = cleaned.match(/^\s*((?:[<>≤≥]=?\s*)?(?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d+)?)/);
  if (!valueMatch) return null;

  const value = numericValue(valueMatch[1]);
  if (value === null) return null;
  const unitText = cleaned.slice(valueMatch.index + valueMatch[0].length);
  const unitMatch = unitText.match(/^\s*([a-zA-Zµμ%]+(?:\s*\/\s*[a-zA-Zµμ]+)?)/);
  const unit = unitMatch?.[1]?.replace(/\s+/g, '') ?? null;
  const normalized = normalizeBiomarkerValue(nutrient, value, unit);

  return {
    nutrient,
    value,
    unit,
    ...(normalized.value !== value || normalized.unit !== unit
      ? { normalizedValue: normalized.value, normalizedUnit: normalized.unit }
      : {}),
    referenceRange,
    flag: flagBiomarkerValue(value, referenceRange),
  };
}

export function normalizeBiomarkerValue(nutrient, value, unit) {
  if (!unit) return { value, unit: null };
  const key = unit.toLowerCase().replace(/μ|µ/g, 'u');
  const targets = {
    'Vitamin D': { target: 'ng/mL', conversions: { 'ng/ml': 1, 'pg/ml': 0.001, 'mg/dl': 10_000_000 } },
    'Vitamin B12': { target: 'pg/mL', conversions: { 'pg/ml': 1, 'ng/ml': 1000, 'mg/dl': 10_000_000 } },
    Iron: { target: 'mg/dL', conversions: { 'mg/dl': 1, 'ug/dl': 0.001, 'mcg/dl': 0.001 } },
    Calcium: { target: 'mg/dL', conversions: { 'mg/dl': 1, 'ng/ml': 0.0001, 'pg/ml': 0.0000001 } },
    Hemoglobin: { target: 'g/dL', conversions: { 'g/dl': 1, 'mg/dl': 0.1 } },
  }[nutrient];
  const factor = targets?.conversions[key];
  return factor ? { value: Math.round(value * factor * 1e6) / 1e6, unit: targets.target } : { value, unit };
}

export function extractValuesFromText(rawText) {
  if (typeof rawText !== 'string' || rawText.trim() === '') return [];

  const matches = [];
  for (const { nutrient, pattern } of nutrientLabels) {
    const labelMatch = new RegExp(pattern.source, 'gi');
    for (const match of rawText.matchAll(labelMatch)) {
      matches.push({
        nutrient,
        index: match.index,
        end: match.index + match[0].length,
      });
    }
  }
  matches.sort((left, right) => left.index - right.index);

  const extracted = new Map();
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    if (extracted.has(match.nutrient)) continue;

    const segment = segmentAfterLabel(rawText, match.end, matches[index + 1]?.index, match.nutrient);
    const value = parseValueSegment(segment, match.nutrient);
    if (value) extracted.set(match.nutrient, value);
  }
  return nutrientLabels.flatMap(({ nutrient }) => (extracted.has(nutrient) ? [extracted.get(nutrient)] : []));
}
