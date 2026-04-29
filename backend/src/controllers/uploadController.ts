import { Request, Response } from 'express';
import { getPresignedDownloadUrl, uploadFiles } from '../services/storageService';

function extractMulterFiles(req: Request): Express.Multer.File[] {
  const maybeFiles = (req as Request & { files?: unknown }).files;
  if (!Array.isArray(maybeFiles)) return [];
  return maybeFiles as Express.Multer.File[];
}

export const uploadManyFiles = async (req: Request, res: Response) => {
  try {
    // Multer middleware already validates file count and types at the route level
    const files = extractMulterFiles(req);

    if (files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
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
