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

test('does not treat iron binding capacity, TIBC, ferritin, urinary calcium, or ionized calcium as target values', () => {
  assert.deepEqual(extractValuesFromText('Iron Binding Capacity 320 ug/dL\nTIBC 320 ug/dL\nFerritin 44 ng/mL\nUrinary Calcium 9 mg/dL\nIonized Calcium 1.2 mmol/L'), []);
});

test('extracts 1200 for Iron and ignores Iron Binding Capacity from dummy report file', async () => {
  const dummyIronPath = fileURLToPath(new URL('./fixtures/dummy-iron-report.txt', import.meta.url));
  const dummyText = await readFile(dummyIronPath, 'utf8');
  const extracted = extractValuesFromText(dummyText);
  assert.equal(extracted.length, 1);
  assert.equal(extracted[0].nutrient, 'Iron');
  assert.equal(extracted[0].value, 1200);
});

test('recognizes additional vitamin labels and parses western and Indian grouped thousands', () => {
  assert.equal(extractValuesFromText('25-hydroxy 1,200 ng/mL')[0]?.value, 1200);
  assert.equal(extractValuesFromText('Vit D3 1,20,000 ng/mL')[0]?.value, 120000);
  assert.equal(extractValuesFromText('Cyanocobalamin 1,200 pg/mL')[0]?.value, 1200);
  assert.equal(extractValuesFromText('Cobalamin 1,20,000 pg/mL')[0]?.value, 120000);
});

test('parses a Hindi biomarker label with a numeric result', () => {
  assert.equal(extractValuesFromText('कैल्शियम 9.4 mg/dL')[0]?.nutrient, 'Calcium');
  assert.equal(extractValuesFromText('विटामिन डी 25 ng/mL')[0]?.value, 25);
});

test('stores original and normalized values and configures bilingual OCR', async () => {
  const [value] = extractValuesFromText('Vitamin D 1,200 pg/mL');
  assert.equal(value.value, 1200);
  assert.equal(value.unit, 'pg/mL');
  assert.equal(value.normalizedValue, 1.2);
  assert.equal(value.normalizedUnit, 'ng/mL');
  const { OCR_SETTINGS } = await import('../src/config/constants.js');
  assert.equal(OCR_SETTINGS.language, 'eng+hin');
});

test('defines report review states and normalized biomarker fields', async () => {
  const Report = (await import('../src/models/Report.js')).default;
  assert.deepEqual(Report.schema.path('reviewStatus').enumValues, ['pending', 'confirmed', 'corrected']);
  assert.ok(Report.schema.path('extractedValues').schema.path('normalizedValue'));
  assert.ok(Report.schema.path('extractedValues').schema.path('normalizedUnit'));
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
