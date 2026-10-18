'use strict';

const path = require('node:path');
const originalWorker = require.resolve('tesseract.js/src/worker-script/node/index.js');
const detectPath = require.resolve('wasm-feature-detect', {
  paths: [path.dirname(originalWorker)],
});
const detect = require(detectPath);

// Tesseract.js 7's Relaxed SIMD core crashes with float traineddata on Node 22.
// Force the regular SIMD core inside the OCR worker while leaving V8 unchanged.
require.cache[detectPath].exports = {
  ...detect,
  relaxedSimd: async () => false,
};

require(originalWorker);
