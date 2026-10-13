import assert from 'node:assert/strict';
import test from 'node:test';
import Report from '../src/models/Report.js';

test('defines the report ownership index and requested schema fields', () => {
  const indexedFields = Report.schema.indexes().map(([fields]) => fields);
  assert.ok(indexedFields.some((fields) => fields.userId === 1));
  for (const field of [
    'userId',
    'fileUrl',
    'fileType',
    'ocrStatus',
    'rawOcrText',
    'extractedValues',
    'uploadedAt',
    'processedAt',
  ]) {
    assert.ok(Report.schema.path(field), `expected Report schema to define ${field}`);
  }
});
