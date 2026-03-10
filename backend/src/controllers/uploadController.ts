import { Request, Response } from 'express';
import {
  ALLOWED_MIMETYPES,
  MAX_FILES_PER_CLAIM,
  getPresignedDownloadUrl,
  uploadFiles,
} from '../services/storageService';

function isMulterFile(value: unknown): value is Express.Multer.File {
  if (!value || typeof value !== 'object') return false;

  const file = value as Partial<Express.Multer.File>;
  return (
    typeof file.mimetype === 'string' &&
    typeof file.originalname === 'string' &&
    typeof file.size === 'number' &&
    Buffer.isBuffer(file.buffer)
  );
}

function extractMulterFiles(req: Request): Express.Multer.File[] {
  const maybeFiles = (req as Request & { files?: unknown }).files;
  if (!Array.isArray(maybeFiles)) return [];

  return maybeFiles.filter(isMulterFile);
}

export const uploadManyFiles = async (req: Request, res: Response) => {
  try {
    const files = extractMulterFiles(req);

    if (files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    if (files.length > MAX_FILES_PER_CLAIM) {
      return res.status(400).json({
        error: 'Too many files',
        details: `Cannot upload more than ${MAX_FILES_PER_CLAIM} files per request`,
      });
    }

    const invalidFile = files.find((file) => !ALLOWED_MIMETYPES.includes(file.mimetype));
    if (invalidFile) {
      return res.status(400).json({
        error: 'Invalid file type',
        details: `Only images and documents are allowed: ${ALLOWED_MIMETYPES.join(', ')}`,
      });
    }

    const uploadResults = await uploadFiles(files, 'uploads');
    const failedUpload = uploadResults.find((result) => !result.success);

    if (failedUpload && !failedUpload.success) {
      return res.status(500).json({
        error: 'Failed to upload file',
        details: failedUpload.error,
      });
    }

    const successfulUploads = uploadResults.filter((result) => result.success);
    const uploadedFiles = await Promise.all(
      successfulUploads.map(async (result) => {
        const fileUrl = await getPresignedDownloadUrl(result.metadata.key, 86400);
        return {
          fileUrl,
          fileKey: result.metadata.key,
          metadata: result.metadata,
        };
      })
    );

    return res.status(200).json({
      files: uploadedFiles,
      count: uploadedFiles.length,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return res.status(500).json({
      error: 'Failed to upload files',
      details: errorMessage,
    });
  }
};
