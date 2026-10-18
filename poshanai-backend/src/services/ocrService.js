import { mkdir, readFile } from 'node:fs/promises';
import { createCanvas } from '@napi-rs/canvas';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createWorker } from 'tesseract.js';
import { fileURLToPath } from 'node:url';
import { OCR_SETTINGS } from '../config/constants.js';
import { extractValuesFromText } from './reportParser.js';

const tesseractCachePath = fileURLToPath(new URL('../../uploads/tesseract-cache/', import.meta.url));
const tesseractDataPath = fileURLToPath(new URL('../../tessdata/', import.meta.url));
const tesseractWorkerPath = fileURLToPath(new URL('./tesseractWorker.cjs', import.meta.url));
let workerPromise;
export { extractValuesFromText } from './reportParser.js';

async function getWorker() {
  if (!workerPromise) {
    workerPromise = mkdir(tesseractCachePath, { recursive: true })
      .then(() => createWorker(OCR_SETTINGS.language, undefined, {
        cachePath: tesseractCachePath,
        langPath: tesseractDataPath,
        gzip: false,
        workerPath: tesseractWorkerPath,
      }))
      .catch((error) => {
        workerPromise = null;
        throw error;
      });
  }
  return workerPromise;
}

async function recognizeImage(image) {
  const worker = await getWorker();
  const result = await worker.recognize(image);
  return result.data.text;
}

async function recognizePdf(filePath) {
  const fileData = await readFile(filePath);
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(fileData),
    isEvalSupported: false,
    useSystemFonts: true,
  });
  const document = await loadingTask.promise;
  const pages = [];

  try {
    if (document.numPages > OCR_SETTINGS.maxPdfPages) {
      const error = new Error(`PDF reports may contain at most ${OCR_SETTINGS.maxPdfPages} pages.`);
      error.statusCode = 413;
      error.code = 'PDF_PAGE_LIMIT_EXCEEDED';
      throw error;
    }

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: OCR_SETTINGS.pdfRenderScale });
      const width = Math.ceil(viewport.width);
      const height = Math.ceil(viewport.height);
      if (width * height > OCR_SETTINGS.maxPdfPagePixels) {
        const error = new Error('A PDF page exceeds the maximum supported render size.');
        error.statusCode = 413;
        error.code = 'PDF_PAGE_TOO_LARGE';
        throw error;
      }
      const canvas = createCanvas(width, height);
      const context = canvas.getContext('2d');
      await page.render({ canvasContext: context, viewport }).promise;
      pages.push(await recognizeImage(canvas.toBuffer('image/png')));
      page.cleanup();
    }
  } finally {
    await loadingTask.destroy();
  }
  return pages.join('\n');
}

async function runOcr(filePath) {
  const fileData = await readFile(filePath);
  if (fileData.subarray(0, 5).toString() === '%PDF-') return recognizePdf(filePath);
  if (fileData[0] === 0xff && fileData[1] === 0xd8 && fileData[2] === 0xff) {
    return recognizeImage(filePath);
  }
  if (fileData.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return recognizeImage(filePath);
  }
  const error = new Error('OCR supports PDF, JPEG, and PNG report files only.');
  error.statusCode = 415;
  error.code = 'UNSUPPORTED_FILE_TYPE';
  throw error;
}

export async function extractTextFromReport(filePath) {
  if (typeof filePath !== 'string' || !filePath.trim()) {
    const error = new Error('A report file path is required for OCR.');
    error.statusCode = 400;
    error.code = 'REPORT_FILE_REQUIRED';
    throw error;
  }

  const rawText = await runOcr(filePath);
  if (!rawText.trim()) {
    const error = new Error('No readable text was found in the report.');
    error.statusCode = 422;
    error.code = 'OCR_NO_TEXT';
    throw error;
  }
  return { rawText, extractedValues: extractValuesFromText(rawText) };
}

export async function closeOcrWorker() {
  const worker = await workerPromise?.catch(() => null);
  workerPromise = null;
  if (worker) await worker.terminate();
}
