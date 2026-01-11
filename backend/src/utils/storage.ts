/**
 * Google Cloud Storage Configuration
 *
 * @deprecated This file is completely deprecated and no longer used.
 * File uploads now use Railway Storage (S3-compatible) via the storageService.
 *
 * For new file uploads, use:
 * - `@/services/storageService` for Railway Storage operations
 * - Files are stored in Railway Storage and only metadata is kept in the database
 *
 * @see https://docs.railway.com/guides/storage-buckets
 */

// Placeholder export to prevent import errors
// This file is kept for backwards compatibility only
export const bucket = null;

// Re-export from the new storage service for migration purposes
export {
  isStorageConfigured,
  uploadFile,
  uploadFiles,
  deleteFile,
  getPresignedDownloadUrl,
  getFileUrl,
} from '../services/storageService';
