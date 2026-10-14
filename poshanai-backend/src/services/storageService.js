import { createReadStream } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { copyFile, mkdir, rename, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl as presignS3Url } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';

const localStorageDirectory = fileURLToPath(new URL('../../uploads/', import.meta.url));
const temporaryDirectory = path.join(os.tmpdir(), 'poshanai-report-downloads');
const validObjectKey = /^(?:reports|uploads\/reports)\/[a-f\d-]+\.(?:pdf|jpg|png)$/i;
let s3Client;

function normalizedKey(key) {
  if (typeof key !== 'string' || !validObjectKey.test(key)) {
    throw new Error('Invalid report storage key.');
  }
  return key;
}

function localFilePath(key) {
  const safeKey = normalizedKey(key);
  const relativePath = safeKey.startsWith('uploads/') ? safeKey.slice('uploads/'.length) : safeKey;
  const resolvedPath = path.resolve(localStorageDirectory, relativePath);
  const uploadsRoot = path.resolve(localStorageDirectory);
  if (!resolvedPath.startsWith(`${uploadsRoot}${path.sep}`)) {
    throw new Error('Invalid report storage key.');
  }
  return resolvedPath;
}

function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: env.s3Region,
      ...(env.s3AccessKey
        ? { credentials: { accessKeyId: env.s3AccessKey, secretAccessKey: env.s3SecretKey } }
        : {}),
    });
  }
  return s3Client;
}

export async function uploadFile(sourcePath, key, contentType) {
  const safeKey = normalizedKey(key);
  if (env.storageType === 'local') {
    const destination = localFilePath(safeKey);
    await mkdir(path.dirname(destination), { recursive: true });
    try {
      await rename(sourcePath, destination);
    } catch (error) {
      if (error.code !== 'EXDEV') throw error;
      await copyFile(sourcePath, destination, constants.COPYFILE_EXCL);
      try {
        await rm(sourcePath);
      } catch (cleanupError) {
        await rm(destination, { force: true });
        throw cleanupError;
      }
    }
    return safeKey;
  }

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: env.s3Bucket,
      Key: safeKey,
      Body: createReadStream(sourcePath),
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
    }),
  );
  return safeKey;
}

export async function downloadFile(key) {
  const safeKey = normalizedKey(key);
  if (env.storageType === 'local') return localFilePath(safeKey);

  const response = await getS3Client().send(
    new GetObjectCommand({ Bucket: env.s3Bucket, Key: safeKey }),
  );
  await mkdir(temporaryDirectory, { recursive: true });
  const localPath = path.join(temporaryDirectory, `${randomUUID()}.report`);
  const content = await response.Body.transformToByteArray();
  await writeFile(localPath, content, { flag: 'wx' });
  return localPath;
}

export async function deleteFile(key) {
  const safeKey = normalizedKey(key);
  if (env.storageType === 'local') {
    await rm(localFilePath(safeKey), { force: true });
    return;
  }
  await getS3Client().send(new DeleteObjectCommand({ Bucket: env.s3Bucket, Key: safeKey }));
}

export async function getSignedUrl(key) {
  const safeKey = normalizedKey(key);
  if (env.storageType === 'local') return null;
  return presignS3Url(
    getS3Client(),
    new GetObjectCommand({
      Bucket: env.s3Bucket,
      Key: safeKey,
      ResponseContentDisposition: 'attachment',
    }),
    { expiresIn: 5 * 60 },
  );
}

export async function cleanupDownloadedFile(filePath) {
  if (env.storageType === 's3') await rm(filePath, { force: true });
}
