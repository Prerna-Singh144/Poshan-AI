import { readFileSync } from 'node:fs';

const RULES_PATH = new URL('../../data/testRules.json', import.meta.url);
const suggestionPattern = /^(?:consider discussing|you may wish to discuss) .+ with (?:your )?doctor\.?$/i;

export function validateTestRules(rulesDocument) {
  if (!rulesDocument || typeof rulesDocument !== 'object' || Array.isArray(rulesDocument)) {
    throw new Error('testRules.json must contain a JSON object.');
  }
  if (rulesDocument.version !== 1 || !Array.isArray(rulesDocument.rules)) {
    throw new Error('testRules.json must provide version 1 and a rules array.');
  }
  if (typeof rulesDocument.disclaimer !== 'string'
    || !/suggestions? to discuss with a doctor/i.test(rulesDocument.disclaimer)) {
    throw new Error('testRules.json must state that entries are suggestions to discuss with a doctor.');
  }
  if (Object.keys(rulesDocument).some((key) => !['version', 'disclaimer', 'rules'].includes(key))) {
    throw new Error('testRules.json contains an unsupported top-level field.');
  }

  const seenIds = new Set();
  for (const rule of rulesDocument.rules) {
    if (!rule || typeof rule !== 'object' || Array.isArray(rule)
      || typeof rule.id !== 'string' || !rule.id.trim()
      || typeof rule.suggestion !== 'string'
      || !suggestionPattern.test(rule.suggestion.trim())
      || Object.keys(rule).some((key) => !['id', 'suggestion'].includes(key))) {
      throw new Error('Each test rule must have an id and a doctor-discussion suggestion.');
    }
    if (seenIds.has(rule.id)) throw new Error(`Duplicate test rule id: ${rule.id}`);
    seenIds.add(rule.id);
  }

  return rulesDocument;
}

export const testRules = validateTestRules(JSON.parse(readFileSync(RULES_PATH, 'utf8')));
