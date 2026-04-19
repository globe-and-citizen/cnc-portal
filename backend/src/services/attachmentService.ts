import { z } from 'zod';
import { type FileAttachmentData } from '../validation';
import { deleteFile, getPresignedDownloadUrl } from './storageService';

export type { FileAttachmentData };

type RefreshedKey = { fileKey: string; fileUrl: string };
type RefreshError = { fileKey: string; error: string };

export type BatchRefreshResult = {
  refreshed: RefreshedKey[];
  errors: RefreshError[];
};

/**
 * Minimal shape needed to *address* a stored file: just a non-empty fileKey.
 * Used on the delete path so we can still clean up legacy rows that are
 * missing other fields (fileUrl/fileType/fileSize) but whose fileKey is valid
 * — those rows would otherwise orphan files in object storage.
 */
const fileKeyOnlySchema = z.object({
  fileKey: z.string().min(1),
});

/**
 * True when `item` is sufficiently well-formed to refresh. We only require
 * the schema here as an existence check for fileKey; the original `item` is
 * returned to preserve any extra keys the canonical schema would strip.
 */
const hasValidFileKey = (item: unknown): item is Record<string, unknown> & { fileKey: string } =>
  fileKeyOnlySchema.safeParse(item).success;

/**
 * Refreshes presigned URLs for an array of file attachments.
 * Preserves the original entry (including any extra fields not covered by
 * the canonical schema) when the presigned URL fetch fails or when the entry
 * lacks a usable fileKey. Only `fileUrl` is ever rewritten.
 */
export const refreshAttachmentUrls = async (attachments: unknown): Promise<unknown> => {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return attachments;
  }

  return Promise.all(
    attachments.map(async (item) => {
      if (!hasValidFileKey(item)) return item;

      try {
        const freshUrl = await getPresignedDownloadUrl(item.fileKey);
        return { ...item, fileUrl: freshUrl };
      } catch {
        return item;
      }
    })
  );
};

/**
 * Deletes all files associated with an array of attachments.
 * Only requires a non-empty `fileKey` — intentionally more permissive than
 * the canonical schema so legacy / partially-formed rows still get cleaned
 * up instead of orphaning files in object storage. Delete failures are
 * logged but do not throw — caller is never blocked.
 */
export const deleteAttachments = async (attachments: unknown): Promise<void> => {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return;
  }

  for (const item of attachments) {
    const parsed = fileKeyOnlySchema.safeParse(item);
    if (!parsed.success) continue;

    try {
      await deleteFile(parsed.data.fileKey);
    } catch (e) {
      console.warn(`Could not delete file ${parsed.data.fileKey}:`, e);
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
