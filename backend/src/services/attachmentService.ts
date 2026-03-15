import { refreshPresignedUrl, deleteFile } from './storageService';

export type FileAttachmentData = {
  fileType: string;
  fileSize: number;
  fileKey: string;
  fileUrl: string;
};

type RefreshedKey = { fileKey: string; fileUrl: string };
type RefreshError = { fileKey: string; error: string };

export type BatchRefreshResult = {
  refreshed: RefreshedKey[];
  errors: RefreshError[];
};

/**
 * Refreshes presigned URLs for an array of file attachments.
 * Returns the original attachment if refresh fails (graceful degradation).
 */
export const refreshAttachmentUrls = async (attachments: unknown): Promise<unknown> => {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return attachments;
  }

  return Promise.all(
    attachments.map(async (attachment) => {
      if (!attachment || typeof attachment !== 'object') {
        return attachment;
      }

      const typedAttachment = attachment as FileAttachmentData;
      if (!typedAttachment.fileKey) {
        return attachment;
      }

      try {
        const freshUrl = await refreshPresignedUrl(typedAttachment.fileKey);
        return {
          ...typedAttachment,
          fileUrl: freshUrl,
        };
      } catch {
        return attachment;
      }
    })
  );
};

/**
 * Deletes all files associated with an array of attachments.
 * Failures are logged but do not throw — caller is never blocked.
 */
export const deleteAttachments = async (attachments: unknown): Promise<void> => {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return;
  }

  for (const attachment of attachments) {
    if (!attachment || typeof attachment !== 'object') continue;

    const typedAttachment = attachment as FileAttachmentData;
    if (!typedAttachment.fileKey || typedAttachment.fileKey.length === 0) continue;

    try {
      await deleteFile(typedAttachment.fileKey);
    } catch (e) {
      console.warn(`Could not delete file ${typedAttachment.fileKey}:`, e);
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
        const fileUrl = await refreshPresignedUrl(fileKey, expirySeconds);
        refreshed.push({ fileKey, fileUrl });
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        errors.push({ fileKey, error: message });
      }
    })
  );

  return { refreshed, errors };
};
