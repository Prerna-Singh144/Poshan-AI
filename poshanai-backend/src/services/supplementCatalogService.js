import { readFileSync } from 'node:fs';

const catalogUrl = new URL('../data/supplements.json', import.meta.url);
const supplements = JSON.parse(readFileSync(catalogUrl, 'utf8'));

export function getSupplementList() {
  return supplements.map((supplement) => ({ ...supplement }));
}

export function getSupplementById(id) {
  return supplements.find((supplement) => supplement.id === id) ?? null;
}

export function getSupplementIds() {
  return supplements.map(({ id }) => id);
}
