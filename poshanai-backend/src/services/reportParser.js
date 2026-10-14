const nutrientLabels = [
  {
    nutrient: 'Vitamin D',
    pattern: /\b(?:25[-\s]?(?:oh|hydroxy)[-\s]?(?:vit(?:amin)?\s*)?d|vit(?:amin)?\s*d)\b/i,
  },
  {
    nutrient: 'Vitamin B12',
    pattern: /\b(?:vitamin\s*b\s*12|vit\s*b\s*12|b\s*12|cobalamin|cyanocobalamin)\b/i,
  },
  { nutrient: 'Iron', pattern: /\b(?:serum\s+iron|iron)\b/i },
  { nutrient: 'Calcium', pattern: /\b(?:serum\s+calcium|calcium)\b/i },
  { nutrient: 'Hemoglobin', pattern: /\b(?:hemoglobin|haemoglobin|hb)\b/i },
];

function numericValue(rawValue) {
  const normalized = rawValue.replace(',', '.').replace(/[<>≤≥=\s]/g, '');
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function flagValue(value, referenceRange) {
  if (!referenceRange) return 'unknown';
  const range = referenceRange.match(
    /^\s*([<>≤≥]=?)?\s*(\d+(?:[.,]\d+)?)(?:\s*[-–]\s*(\d+(?:[.,]\d+)?))?\s*$/,
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

  return segment
    .replace(/^\s*(?:\([^)]*\)\s*)+/i, ' ')
    .replace(/^\s*25[-\s]?oh\b/i, ' ')
    .replace(/^\s*(?:result|value|observed\s+value)\s*[:\-]?\s*/i, '')
    .trim();
}

function parseValueSegment(segment, nutrient) {
  const rangeMatch = segment.match(
    /(?:reference(?:\s+range|\s+interval)?\s*:?\s*)?([<>≤≥]=?\s*\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?\s*[-–]\s*\d+(?:[.,]\d+)?)(?:\s*[a-zA-Z%µμ/]+)?\s*$/i,
  );
  const referenceRange = rangeMatch?.[1]?.replace(/\s+/g, ' ').trim() ?? null;
  const resultText = rangeMatch ? segment.slice(0, rangeMatch.index) : segment;
  const valueMatch = resultText.replace(/^\s*(?:result|value|observed\s+value)\s*[:\-]?\s*/i, '')
    .match(/^\s*((?:[<>≤≥]=?\s*)?\d+(?:[.,]\d+)?)/);
  if (!valueMatch) return null;

  const value = numericValue(valueMatch[1]);
  if (value === null) return null;
  const unitText = resultText.slice(valueMatch.index + valueMatch[0].length);
  const unitMatch = unitText.match(/^\s*([a-zA-Zµμ%]+(?:\s*\/\s*[a-zA-Zµμ]+)?)/);
  const unit = unitMatch?.[1]?.replace(/\s+/g, '') ?? null;

  return {
    nutrient,
    value,
    unit,
    referenceRange,
    flag: flagValue(value, referenceRange),
  };
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
