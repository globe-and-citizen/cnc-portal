import type { getPresignedUrlQuerySchema } from '../validation/schemas/storage';
import type { z as Zod } from 'zod';
import { Request, Response } from 'express';
import { getPresignedDownloadUrl, PRESIGNED_URL_EXPIRATION } from '../services/storageService';
import { captureBackendException } from '../utils';

export const getFileUrl = async (
  req: Request,
  res: Response<unknown, { validatedQuery: Zod.output<typeof getPresignedUrlQuerySchema> }>
) => {
  try {
    // Query is already validated by route-level Zod middleware
    const { key, expiresIn } = res.locals.validatedQuery;

    let expirationSeconds = PRESIGNED_URL_EXPIRATION;
    if (expiresIn) {
      expirationSeconds = Math.min(expiresIn, 604800);
    }

    const url = await getPresignedDownloadUrl(key, expirationSeconds);

    res.json({
      url,
      expiresIn: expirationSeconds,
    });
  } catch (err: unknown) {
    captureBackendException(err, {
      operation: 'getFileUrl',
      source: 'storageController',
      status: 500,
    });
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('Error generating presigned URL:', err);
    res.status(500).json({
      error: 'Failed to generate file URL',
      details: errorMessage,
    });
  }
};
