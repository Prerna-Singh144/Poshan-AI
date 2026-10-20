import { randomUUID } from 'node:crypto';
import { chmod, mkdir, open, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { uploadFile, deleteFile } from '../services/storageService.js';
import httpError from '../utils/httpError.js';
import { UPLOAD_SETTINGS } from '../config/constants.js';

const stagingDirectory = fileURLToPath(new URL('../../uploads/staging/', import.meta.url));
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

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    mkdir(stagingDirectory, { recursive: true, mode: 0o700 }).then(
      () => chmod(stagingDirectory, 0o700),
    ).then(
      () => callback(null, stagingDirectory),
      callback,
    );
  },
  filename: (_req, file, callback) => {
    callback(null, `${randomUUID()}${extensionsByMimeType.get(file.mimetype) ?? ''}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: UPLOAD_SETTINGS.maxFileSizeBytes,
    files: UPLOAD_SETTINGS.maxFiles,
    fields: UPLOAD_SETTINGS.maxFields,
  },
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

export async function cleanupUploadedFile(file) {
  let cleanupError;
  if (file?.storageKey) {
    try {
      await deleteFile(file.storageKey);
    } catch (error) {
      cleanupError = error;
    }
  }
  if (file?.path) {
    try {
      await removeUploadedFile(file.path);
    } catch (error) {
      cleanupError ??= error;
    }
  }
  if (cleanupError) throw cleanupError;
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
      req.file.storageKey = await uploadFile(
        req.file.path,
        `reports/${req.file.filename}`,
        req.file.mimetype,
      );
      await removeUploadedFile(req.file.path);
      return next();
    } catch (validationError) {
      try {
        await cleanupUploadedFile(req.file);
      } catch {
        return next(httpError(500, 'UPLOAD_CLEANUP_FAILED', 'The uploaded file could not be safely cleaned up.'));
      }
      return next(validationError);
    }
  });
}

export const maxFileSize = UPLOAD_SETTINGS.maxFileSizeBytes;
