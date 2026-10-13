import { randomUUID } from 'node:crypto';
import { mkdir, open, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';

const uploadDirectory = fileURLToPath(new URL('../../uploads/reports/', import.meta.url));
const maxFileSize = 10 * 1024 * 1024;
const extensionsByMimeType = new Map([
  ['application/pdf', '.pdf'],
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
]);
const signaturesByMimeType = new Map([
  ['application/pdf', Buffer.from('%PDF-')],
  ['image/jpeg', Buffer.from([0xff, 0xd8, 0xff])],
  ['image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
]);

function httpError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    mkdir(uploadDirectory, { recursive: true }).then(
      () => callback(null, uploadDirectory),
      callback,
    );
  },
  filename: (_req, file, callback) => {
    callback(null, `${randomUUID()}${extensionsByMimeType.get(file.mimetype) ?? ''}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: maxFileSize, files: 1, fields: 0 },
  fileFilter: (_req, file, callback) => {
    if (!extensionsByMimeType.has(file.mimetype)) {
      return callback(httpError(415, 'UNSUPPORTED_FILE_TYPE', 'Only PDF, JPEG, and PNG files are allowed.'));
    }
    return callback(null, true);
  },
}).single('file');

async function hasValidSignature(file) {
  const signature = signaturesByMimeType.get(file.mimetype);
  const handle = await open(file.path, 'r');
  try {
    const buffer = Buffer.alloc(signature.length);
    const { bytesRead } = await handle.read(buffer, 0, signature.length, 0);
    return bytesRead === signature.length && buffer.equals(signature);
  } finally {
    await handle.close();
  }
}

export async function removeUploadedFile(filePath) {
  if (!filePath) return;
  await rm(filePath, { force: true });
}

export default function uploadReportFile(req, res, next) {
  upload(req, res, async (error) => {
    if (error) {
      if (error instanceof multer.MulterError) {
        const isTooLarge = error.code === 'LIMIT_FILE_SIZE';
        return next(
          httpError(
            isTooLarge ? 413 : 400,
            isTooLarge ? 'FILE_TOO_LARGE' : 'INVALID_UPLOAD',
            isTooLarge ? 'The maximum report file size is 10 MB.' : 'The upload must contain one file in the file field.',
          ),
        );
      }
      return next(error);
    }

    if (!req.file) return next(httpError(400, 'FILE_REQUIRED', 'A report file is required.'));

    try {
      if (!(await hasValidSignature(req.file))) {
        await removeUploadedFile(req.file.path);
        return next(httpError(415, 'INVALID_FILE_CONTENT', 'The uploaded file content does not match its declared type.'));
      }
      return next();
    } catch (validationError) {
      try {
        await removeUploadedFile(req.file.path);
      } catch {
        return next(httpError(500, 'UPLOAD_CLEANUP_FAILED', 'The uploaded file could not be safely cleaned up.'));
      }
      return next(validationError);
    }
  });
}

export { maxFileSize, uploadDirectory };
