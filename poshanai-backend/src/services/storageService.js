import { createReadStream } from 'node:fs';
import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { copyFile, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl as presignS3Url } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';

const localStorageDirectory = fileURLToPath(new URL('../../uploads/', import.meta.url));
const temporaryDirectory = path.join(os.tmpdir(), 'poshanai-report-downloads');
const validObjectKey = /^(?:reports|uploads\/reports)\/[a-f\d-]+\.(?:pdf|jpg|png)$/i;
const AES_HEADER = Buffer.from('POSHAN_AES256GCM_');
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
let s3Client;

function getEncryptionKey() {
  return Buffer.from(env.encryptionKey, 'base64');
}

export function encryptBuffer(buffer) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([AES_HEADER, iv, tag, encrypted]);
}

export function decryptBuffer(buffer) {
  if (
    buffer.length < AES_HEADER.length + IV_LENGTH + TAG_LENGTH ||
    !buffer.subarray(0, AES_HEADER.length).equals(AES_HEADER)
  ) {
    return buffer;
  }
  const iv = buffer.subarray(AES_HEADER.length, AES_HEADER.length + IV_LENGTH);
  const tag = buffer.subarray(AES_HEADER.length + IV_LENGTH, AES_HEADER.length + IV_LENGTH + TAG_LENGTH);
  const ciphertext = buffer.subarray(AES_HEADER.length + IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

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
    const content = await readFile(sourcePath);
    const encrypted = encryptBuffer(content);
    await writeFile(destination, encrypted);
    await rm(sourcePath, { force: true });
    return safeKey;
  }

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: env.s3Bucket,
      Key: safeKey,
      Body: createReadStream(sourcePath),
      ContentType: contentType,
      ServerSideEncryption: env.s3KmsKeyId ? 'aws:kms' : 'AES256',
      ...(env.s3KmsKeyId ? { SSEKMSKeyId: env.s3KmsKeyId } : {}),
    }),
  );
  return safeKey;
}

export async function downloadFile(key) {
  const safeKey = normalizedKey(key);
  if (env.storageType === 'local') {
    const raw = await readFile(localFilePath(safeKey));
    const decrypted = decryptBuffer(raw);
    await mkdir(temporaryDirectory, { recursive: true });
    const localPath = path.join(temporaryDirectory, `${randomUUID()}.report`);
    await writeFile(localPath, decrypted, { flag: 'wx' });
    return localPath;
  }

  const response = await getS3Client().send(
    new GetObjectCommand({ Bucket: env.s3Bucket, Key: safeKey }),
  );
  await mkdir(temporaryDirectory, { recursive: true });
  const localPath = path.join(temporaryDirectory, `${randomUUID()}.report`);
  const content = await response.Body.transformToByteArray();
  await writeFile(localPath, content, { flag: 'wx' });
  return localPath;
}

export async function getFileBuffer(key) {
  const safeKey = normalizedKey(key);
  if (env.storageType === 'local') {
    const raw = await readFile(localFilePath(safeKey));
    return decryptBuffer(raw);
  }
  const response = await getS3Client().send(
    new GetObjectCommand({ Bucket: env.s3Bucket, Key: safeKey }),
  );
  const content = await response.Body.transformToByteArray();
  return Buffer.from(content);
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
  if (filePath?.startsWith(temporaryDirectory) || env.storageType === 's3') {
    await rm(filePath, { force: true });
  }
}
