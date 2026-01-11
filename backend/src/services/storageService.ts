/**
 * Railway Storage Service (S3-compatible)
 *
 * Stores files in Railway Object Storage via the S3 API. Only the URL/key
 * should be saved in the database. Filenames are generated as a SHA-256 hash
 * of `${timestamp}-${originalName}` and we keep the original extension.
 */
import crypto from 'crypto';
import path from 'path';
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Defaults and limits
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_FILES_PER_CLAIM = 10;

export const ALLOWED_IMAGE_MIMETYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
] as const;
export const ALLOWED_DOCUMENT_MIMETYPES = [
  'application/pdf',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;
export const ALLOWED_MIMETYPES = [
  ...ALLOWED_IMAGE_MIMETYPES,
  ...ALLOWED_DOCUMENT_MIMETYPES,
] as readonly string[];

export const PRESIGNED_URL_EXPIRATION = 60 * 60; // 1 hour

type StorageConfig = {
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  endpoint: string;
};

function getStorageConfig(): StorageConfig {
  const bucket = process.env.BUCKET;
  const accessKeyId = process.env.ACCESS_KEY_ID;
  const secretAccessKey = process.env.SECRET_ACCESS_KEY;
  const region = process.env.REGION || 'auto';
  const endpoint = process.env.ENDPOINT || 'https://storage.railway.app';

  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Missing Railway Storage configuration. Please set BUCKET, ACCESS_KEY_ID, and SECRET_ACCESS_KEY environment variables.'
    );
  }

  return { bucket, accessKeyId, secretAccessKey, region, endpoint };
}

export function isStorageConfigured(): boolean {
  try {
    getStorageConfig();
    return true;
  } catch {
    return false;
  }
}

function createS3Client(): S3Client {
  const cfg = getStorageConfig();
  return new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
}

export type FileMetadata = {
  id: string; // hashed name without extension
  key: string; // full object key (folder/hashed.ext)
  fileName: string;
  fileType: string;
  fileSize: number;
};

export type UploadResult =
  | { success: true; metadata: FileMetadata }
  | { success: false; error: string };

export function generateFileKey(folder: string, originalName: string): string {
  const timestamp = Date.now().toString();
  const ext = path.extname(originalName).toLowerCase();
  const base = `${timestamp}-${originalName}`;
  const hash = crypto.createHash('sha256').update(base).digest('hex');
  return `${folder}/${hash}${ext}`;
}

export function validateFile(
  file: Express.Multer.File,
  allowed: readonly string[] = ALLOWED_MIMETYPES,
  maxSize: number = MAX_FILE_SIZE
): { valid: true } | { valid: false; error: string } {
  if (!allowed.includes(file.mimetype)) {
    return {
      valid: false,
      error:
        'Only image files (png, jpg, jpeg, webp) and documents (pdf, txt, zip, docx) are allowed',
    };
  }
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size (${fileSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`,
    };
  }
  return { valid: true };
}

export async function uploadFile(
  file: Express.Multer.File,
  folder: string = 'uploads'
): Promise<UploadResult> {
  try {
    const validation = validateFile(file);
    if (!validation.valid) return { success: false, error: validation.error };

    const cfg = getStorageConfig();
    const client = createS3Client();
    const key = generateFileKey(folder, file.originalname);
    const id = path.basename(key, path.extname(key));

    await client.send(
      new PutObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: 'public, max-age=31536000',
      })
    );

    return {
      success: true,
      metadata: {
        id,
        key,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
      },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to upload file:', error);
    return { success: false, error: `Failed to upload file: ${msg}` };
  }
}

export async function uploadFiles(
  files: Express.Multer.File[],
  folder: string = 'uploads'
): Promise<UploadResult[]> {
  // Validate file count limit
  if (files.length > MAX_FILES_PER_CLAIM) {
    return Array(files.length).fill({
      success: false,
      error: `Cannot upload more than ${MAX_FILES_PER_CLAIM} files per claim`,
    }) as UploadResult[];
  }

  const results: UploadResult[] = [];
  for (const f of files) results.push(await uploadFile(f, folder));
  return results;
}

export async function getPresignedDownloadUrl(
  fileKey: string,
  expiresIn: number = PRESIGNED_URL_EXPIRATION
): Promise<string> {
  const cfg = getStorageConfig();
  const client = createS3Client();
  // Optionally probe existence; ignore errors
  await client
    .send(new HeadObjectCommand({ Bucket: cfg.bucket, Key: fileKey }))
    .catch(() => undefined);
  const getObj = new GetObjectCommand({ Bucket: cfg.bucket, Key: fileKey });
  return getSignedUrl(client, getObj, { expiresIn });
}

export async function deleteFile(fileKey: string): Promise<boolean> {
  try {
    const cfg = getStorageConfig();
    const client = createS3Client();
    await client.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: fileKey }));
    return true;
  } catch (e) {
    console.error('Error deleting file from storage:', e);
    return false;
  }
}

// Note: fileExists() is not currently used but kept for future use cases
// (e.g., validation before downloading, existence checks, etc.)
/*
export async function fileExists(fileKey: string): Promise<boolean> {
  try {
    const cfg = getStorageConfig();
    const client = createS3Client();
    await client.send(new HeadObjectCommand({ Bucket: cfg.bucket, Key: fileKey }));
    return true;
  } catch {
    return false;
  }
}
*/

export async function uploadProfileImage(
  file: Express.Multer.File,
  userAddress: string
): Promise<UploadResult> {
  const validation = validateFile(file, ALLOWED_IMAGE_MIMETYPES, MAX_FILE_SIZE);
  if (!validation.valid) return { success: false, error: validation.error };
  const folder = `profiles/${userAddress.toLowerCase()}`;
  return uploadFile(file, folder);
}

export default {
  isStorageConfigured,
  uploadFile,
  uploadFiles,
  deleteFile,
  // fileExists, // Commented out - not currently used
  getPresignedDownloadUrl,
  uploadProfileImage,
  validateFile,
  generateFileKey,
  ALLOWED_IMAGE_MIMETYPES,
  ALLOWED_DOCUMENT_MIMETYPES,
  ALLOWED_MIMETYPES,
  MAX_FILE_SIZE,
  MAX_FILES_PER_CLAIM,
};
