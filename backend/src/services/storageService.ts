/**
 * Railway Storage Service (S3-compatible)
 *
 * This service handles file uploads to Railway Object Storage using the S3-compatible API.
 * Files are stored in the bucket and only the URL/key is saved in the database.
 *
 * Railway Storage Variables (set in environment):
 * - BUCKET: The globally unique bucket name for the S3 API
 * - SECRET_ACCESS_KEY: The secret key for the S3 API
 * - ACCESS_KEY_ID: The key id for the S3 API
 * - REGION: The region for the S3 API (default: 'auto')
 * - ENDPOINT: The S3 API endpoint (default: 'https://storage.railway.app')
 *
 * @see https://docs.railway.com/guides/storage-buckets
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createPresignedPost, PresignedPost } from '@aws-sdk/s3-presigned-post';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Allowed MIME types for images (expanded to match frontend and common devices)
export const ALLOWED_IMAGE_MIMETYPES = [
  'image/png',
  'image/x-png',
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/jfif',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/svg+xml',
  'image/x-icon',
  'image/heic',
  'image/avif',
];

// Allowed MIME types for documents
export const ALLOWED_DOCUMENT_MIMETYPES = [
  'application/pdf',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
];

// All allowed MIME types
export const ALLOWED_MIMETYPES = [...ALLOWED_IMAGE_MIMETYPES, ...ALLOWED_DOCUMENT_MIMETYPES];

// Maximum file size (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Maximum files per claim
export const MAX_FILES_PER_CLAIM = 10;

// Presigned URL expiration (1 hour for downloads, can be up to 7 days)
export const PRESIGNED_URL_EXPIRATION = 3600;

/**
 * Storage configuration type
 */
interface StorageConfig {
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  endpoint: string;
}

/**
 * File metadata stored in the database
 */
export interface FileMetadata {
  id: string; // Unique file ID (UUID)
  key: string; // S3 object key (path in bucket)
  fileName: string; // Original file name
  fileType: string; // MIME type
  fileSize: number; // Size in bytes
  uploadedAt: string; // ISO date string
}

/**
 * Upload result from the storage service
 */
export interface UploadResult {
  success: boolean;
  metadata?: FileMetadata;
  error?: string;
}

/**
 * Get storage configuration from environment variables
 */
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

  return {
    bucket,
    accessKeyId,
    secretAccessKey,
    region,
    endpoint,
  };
}

/**
 * Check if storage is configured
 */
export function isStorageConfigured(): boolean {
  try {
    getStorageConfig();
    return true;
  } catch {
    return false;
  }
}

/**
 * Create S3 client for Railway Storage
 */
function createS3Client(): S3Client {
  const config = getStorageConfig();

  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: false, // Railway uses virtual-hosted-style URLs
  });
}

/**
 * Generate a unique file key (path in the bucket)
 *
 * @param folder - The folder path (e.g., 'claims', 'profiles')
 * @param originalFileName - The original file name
 * @returns A unique key like 'claims/2024/01/uuid.ext'
 */
export function generateFileKey(folder: string, originalFileName: string): string {
  const fileId = uuidv4();
  const ext = path.extname(originalFileName).toLowerCase();
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${folder}/${year}/${month}/${fileId}${ext}`;
}

/**
 * Validate file before upload
 *
 * @param file - The multer file object
 * @param allowedMimeTypes - List of allowed MIME types
 * @param maxSize - Maximum file size in bytes
 * @returns Validation result with error message if invalid
 */
export function validateFile(
  file: Express.Multer.File,
  allowedMimeTypes: string[] = ALLOWED_MIMETYPES,
  maxSize: number = MAX_FILE_SIZE
): { valid: boolean; error?: string } {
  // Check MIME type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: `File type '${file.mimetype}' is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
    };
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size (${fileSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`,
    };
  }

  return { valid: true };
}

/**
 * Upload a file to Railway Storage
 *
 * @param file - The multer file object
 * @param folder - The folder path in the bucket
 * @returns Upload result with file metadata
 */
export async function uploadFile(
  file: Express.Multer.File,
  folder: string = 'uploads'
): Promise<UploadResult> {
  try {
    // Validate the file
    const validation = validateFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const config = getStorageConfig();
    const client = createS3Client();
    const fileKey = generateFileKey(folder, file.originalname);
    const fileId = path.basename(fileKey, path.extname(fileKey));

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: config.bucket,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentLength: file.size,
      Metadata: {
        originalName: encodeURIComponent(file.originalname),
        uploadedAt: new Date().toISOString(),
      },
    });

    await client.send(command);

    const metadata: FileMetadata = {
      id: fileId,
      key: fileKey,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
    };

    return { success: true, metadata };
  } catch (error) {
    console.error('Error uploading file to storage:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, error: `Failed to upload file: ${errorMessage}` };
  }
}

/**
 * Upload multiple files to Railway Storage
 *
 * @param files - Array of multer file objects
 * @param folder - The folder path in the bucket
 * @returns Array of upload results
 */
export async function uploadFiles(
  files: Express.Multer.File[],
  folder: string = 'uploads'
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (const file of files) {
    const result = await uploadFile(file, folder);
    results.push(result);
  }

  return results;
}

/**
 * Generate a presigned URL for downloading a file
 *
 * @param fileKey - The S3 object key
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns The presigned URL
 */
export async function getPresignedDownloadUrl(
  fileKey: string,
  expiresIn: number = PRESIGNED_URL_EXPIRATION
): Promise<string> {
  const config = getStorageConfig();
  const client = createS3Client();

  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: fileKey,
  });

  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Generate a presigned URL for uploading a file directly from the client
 * This avoids streaming through the backend service
 *
 * @param fileName - The original file name
 * @param folder - The folder path in the bucket
 * @param contentType - The expected content type
 * @param maxSize - Maximum allowed file size
 * @returns Presigned POST data for client-side upload
 */
export async function getPresignedUploadUrl(
  fileName: string,
  folder: string = 'uploads',
  contentType?: string,
  maxSize: number = MAX_FILE_SIZE
): Promise<PresignedPost & { key: string }> {
  const config = getStorageConfig();
  const client = createS3Client();
  const fileKey = generateFileKey(folder, fileName);

  const conditions: Array<
    | { bucket: string }
    | ['eq', string, string]
    | ['starts-with', string, string]
    | ['content-length-range', number, number]
  > = [{ bucket: config.bucket }, ['eq', '$key', fileKey], ['content-length-range', 0, maxSize]];

  // Add content type restriction if specified
  if (contentType) {
    conditions.push(['starts-with', '$Content-Type', contentType.split('/')[0] + '/']);
  }

  const presignedPost = await createPresignedPost(client, {
    Bucket: config.bucket,
    Key: fileKey,
    Expires: 3600, // 1 hour
    Conditions: conditions,
  });

  return { ...presignedPost, key: fileKey };
}

/**
 * Delete a file from Railway Storage
 *
 * @param fileKey - The S3 object key
 * @returns True if deleted successfully
 */
export async function deleteFile(fileKey: string): Promise<boolean> {
  try {
    const config = getStorageConfig();
    const client = createS3Client();

    const command = new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: fileKey,
    });

    await client.send(command);
    return true;
  } catch (error) {
    console.error('Error deleting file from storage:', error);
    return false;
  }
}

/**
 * Delete multiple files from Railway Storage
 *
 * @param fileKeys - Array of S3 object keys
 * @returns Number of files successfully deleted
 */
export async function deleteFiles(fileKeys: string[]): Promise<number> {
  let deletedCount = 0;

  for (const key of fileKeys) {
    if (await deleteFile(key)) {
      deletedCount++;
    }
  }

  return deletedCount;
}

/**
 * Check if a file exists in Railway Storage
 *
 * @param fileKey - The S3 object key
 * @returns True if the file exists
 */
export async function fileExists(fileKey: string): Promise<boolean> {
  try {
    const config = getStorageConfig();
    const client = createS3Client();

    const command = new HeadObjectCommand({
      Bucket: config.bucket,
      Key: fileKey,
    });

    await client.send(command);
    return true;
  } catch {
    return false;
  }
}

/**
 * Upload a profile image to Railway Storage
 *
 * @param file - The multer file object
 * @param userAddress - The user's Ethereum address
 * @returns Upload result with file metadata
 */
export async function uploadProfileImage(
  file: Express.Multer.File,
  userAddress: string
): Promise<UploadResult> {
  // Validate that it's an image
  const validation = validateFile(file, ALLOWED_IMAGE_MIMETYPES, MAX_FILE_SIZE);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Use a consistent path for profile images
  const folder = `profiles/${userAddress.toLowerCase()}`;
  return uploadFile(file, folder);
}

/**
 * Get the public URL for a file (via presigned URL)
 * Since Railway buckets are private, this generates a presigned URL
 *
 * @param fileKey - The S3 object key
 * @param expiresIn - URL expiration time in seconds
 * @returns The presigned URL for accessing the file
 */
export async function getFileUrl(
  fileKey: string,
  expiresIn: number = PRESIGNED_URL_EXPIRATION
): Promise<string> {
  return getPresignedDownloadUrl(fileKey, expiresIn);
}

export default {
  isStorageConfigured,
  uploadFile,
  uploadFiles,
  deleteFile,
  deleteFiles,
  fileExists,
  getPresignedDownloadUrl,
  getPresignedUploadUrl,
  getFileUrl,
  uploadProfileImage,
  validateFile,
  generateFileKey,
  ALLOWED_IMAGE_MIMETYPES,
  ALLOWED_DOCUMENT_MIMETYPES,
  ALLOWED_MIMETYPES,
  MAX_FILE_SIZE,
  MAX_FILES_PER_CLAIM,
};
