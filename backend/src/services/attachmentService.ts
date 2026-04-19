import { fileAttachmentSchema, type FileAttachmentData } from '../validation';
import { deleteFile, getPresignedDownloadUrl } from './storageService';

export type { FileAttachmentData };

type RefreshedKey = { fileKey: string; fileUrl: string };
type RefreshError = { fileKey: string; error: string };

export type BatchRefreshResult = {
  refreshed: RefreshedKey[];
  errors: RefreshError[];
};

/**
 * Parse a single stored attachment entry against the canonical schema.
 * Returns null for legacy / malformed rows so callers can skip them without
 * crashing. The stored JSON column historically had no schema enforcement, so
 * tolerance on read is intentional.
 */
const parseAttachment = (item: unknown): FileAttachmentData | null => {
  const parsed = fileAttachmentSchema.safeParse(item);
  return parsed.success ? parsed.data : null;
};

/**
 * Refreshes presigned URLs for an array of file attachments.
 * Preserves the original entry when it doesn't match the schema or when the
 * presigned URL fetch fails (graceful degradation).
 */
export const refreshAttachmentUrls = async (attachments: unknown): Promise<unknown> => {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return attachments;
  }

  return Promise.all(
    attachments.map(async (item) => {
      const valid = parseAttachment(item);
      if (!valid) return item;

      try {
        const freshUrl = await getPresignedDownloadUrl(valid.fileKey);
        return { ...valid, fileUrl: freshUrl };
      } catch {
        return valid;
      }
    })
  );
};

/**
 * Deletes all files associated with an array of attachments.
 * Skips entries that fail schema validation. Failures on delete are logged
 * but do not throw — caller is never blocked.
 */
export const deleteAttachments = async (attachments: unknown): Promise<void> => {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return;
  }

  for (const item of attachments) {
    const valid = parseAttachment(item);
    if (!valid) continue;

    try {
      await deleteFile(valid.fileKey);
    } catch (e) {
      console.warn(`Could not delete file ${valid.fileKey}:`, e);
    }
  }
};

/**
 * Deletes a single file by its storage key.
 * Returns true if deleted, false on error. Never throws.
 */
export const deleteFileByKey = async (fileKey: string): Promise<boolean> => {
  try {
    return await deleteFile(fileKey);
  } catch (e) {
    console.warn(`Could not delete file ${fileKey}:`, e);
    return false;
  }
};

/**
 * Batch-refresh presigned URLs for an array of file keys.
 * Returns a structured result with successfully refreshed URLs and any errors.
 */
export const batchRefreshUrls = async (
  fileKeys: string[],
  expirySeconds?: number
): Promise<BatchRefreshResult> => {
  const refreshed: RefreshedKey[] = [];
  const errors: RefreshError[] = [];

  await Promise.all(
    fileKeys.map(async (fileKey) => {
      try {
        const fileUrl = await getPresignedDownloadUrl(fileKey, expirySeconds);
        refreshed.push({ fileKey, fileUrl });
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        errors.push({ fileKey, error: message });
      }
    })
  );

  return { refreshed, errors };
};
