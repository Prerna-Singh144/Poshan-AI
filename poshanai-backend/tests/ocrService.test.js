import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { extractValuesFromText } from '../src/services/ocrService.js';
import { maxFileSize } from '../src/middleware/uploadMiddleware.js';

const sampleReportPath = fileURLToPath(new URL('./fixtures/sample-blood-report.txt', import.meta.url));

test('extracts report values and flags from a sample Dr Lal, Apollo, and SRL report', async () => {
  const reportText = await readFile(sampleReportPath, 'utf8');
  const values = extractValuesFromText(reportText);

  assert.deepEqual(
    values.map(({ nutrient, value, unit, referenceRange, flag }) => ({
      nutrient,
      value,
      unit,
      referenceRange,
      flag,
    })),
    [
      {
        nutrient: 'Vitamin D',
        value: 22.6,
        unit: 'ng/mL',
        referenceRange: '30 - 100',
        flag: 'low',
      },
      {
        nutrient: 'Vitamin B12',
        value: 284,
        unit: 'pg/mL',
        referenceRange: '197 - 771',
        flag: 'normal',
      },
      {
        nutrient: 'Iron',
        value: 44,
        unit: 'ug/dL',
        referenceRange: '50 - 170',
        flag: 'low',
      },
      {
        nutrient: 'Calcium',
        value: 9.3,
        unit: 'mg/dL',
        referenceRange: '8.6 - 10.2',
        flag: 'normal',
      },
      {
        nutrient: 'Hemoglobin',
        value: 13.2,
        unit: 'g/dL',
        referenceRange: '12.0 - 15.0',
        flag: 'normal',
      },
    ],
  );
});

test('leaves the flag unknown when the report does not provide a reference range', () => {
  assert.deepEqual(extractValuesFromText('Vitamin D 32.5 ng/mL'), [
    {
      nutrient: 'Vitamin D',
      value: 32.5,
      unit: 'ng/mL',
      referenceRange: null,
      flag: 'unknown',
    },
  ]);
});

test('parses a table where the observed value and range are on following lines', () => {
  assert.deepEqual(
    extractValuesFromText('Vitamin D (25-OH)\nResult: 32.5\nng/mL\n20 - 50'),
    [
      {
        nutrient: 'Vitamin D',
        value: 32.5,
        unit: 'ng/mL',
        referenceRange: '20 - 50',
        flag: 'normal',
      },
    ],
  );
});

test('rejects a missing report path with a structured error', async () => {
  const { extractTextFromReport } = await import('../src/services/ocrService.js');
  await assert.rejects(extractTextFromReport(''), {
    code: 'REPORT_FILE_REQUIRED',
    statusCode: 400,
  });

  test('caps report uploads at 10 MB', () => {
    assert.equal(maxFileSize, 10 * 1024 * 1024);
  });
});
