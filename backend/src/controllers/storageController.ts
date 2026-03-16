import { Request, Response } from 'express';
import { getPresignedDownloadUrl, PRESIGNED_URL_EXPIRATION } from '../services/storageService';

export const getFileUrl = async (req: Request, res: Response) => {
  try {
    // Query is already validated by route-level Zod middleware
    const { key, expiresIn } = req.query as { key: string; expiresIn?: string };

    let expirationSeconds = PRESIGNED_URL_EXPIRATION;
    if (expiresIn) {
      expirationSeconds = Math.min(parseInt(expiresIn, 10), 604800);
    }

    const url = await getPresignedDownloadUrl(key, expirationSeconds);

    res.json({
      url,
      expiresIn: expirationSeconds,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('Error generating presigned URL:', err);
    res.status(500).json({
      error: 'Failed to generate file URL',
      details: errorMessage,
    });
  }
};
