// routes/storageRoute.ts
import express, { Request, Response } from 'express';
import { authorizeUser } from '../middleware/authMiddleware';
import {
  getPresignedDownloadUrl,
  isStorageConfigured,
  PRESIGNED_URL_EXPIRATION,
} from '../services/storageService';

const storageRouter = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     FileUrlResponse:
 *       type: object
 *       properties:
 *         url:
 *           type: string
 *           description: Presigned URL for accessing the file
 *         expiresIn:
 *           type: number
 *           description: URL expiration time in seconds
 *     FileErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: Error message
 *         details:
 *           type: string
 *           description: Detailed error information
 */

/**
 * @openapi
 * /file/url:
 *   get:
 *     summary: Get a presigned URL for downloading a file
 *     description: Generates a presigned URL for accessing a file stored in Railway Storage. Requires authentication.
 *     tags: [Files]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: The S3 object key (file path in storage)
 *         example: "claims/2024/01/abc123.pdf"
 *       - in: query
 *         name: expiresIn
 *         schema:
 *           type: number
 *           default: 3600
 *         description: URL expiration time in seconds (max 604800 = 7 days)
 *     responses:
 *       200:
 *         description: Presigned URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FileUrlResponse'
 *       400:
 *         description: Missing or invalid parameters
 *       404:
 *         description: File not found
 *       500:
 *         description: Storage not configured or error generating URL
 */
storageRouter.get('/url', authorizeUser, async (req: Request, res: Response) => {
  try {
    const { key, expiresIn } = req.query;

    if (!key || typeof key !== 'string') {
      return res.status(400).json({
        error: 'Missing required parameter',
        details: 'The "key" query parameter is required',
      });
    }

    // Parse and validate expiration time
    let expirationSeconds = PRESIGNED_URL_EXPIRATION;
    if (expiresIn) {
      const parsedExpiration = parseInt(expiresIn as string, 10);
      if (!isNaN(parsedExpiration) && parsedExpiration > 0) {
        // Cap at 7 days (604800 seconds)
        expirationSeconds = Math.min(parsedExpiration, 604800);
      }
    }

    // Generate presigned URL (will fail if file doesn't exist)
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
});

// Note: The /download/* route is commented out as it's redundant.
// The frontend already receives fileUrl from upload, and can use /file/url
// to regenerate expired URLs. Direct download can be done client-side.
/*
storageRouter.get('/download/*', authorizeUser, async (req: Request, res: Response) => {
  try {
    // Get the key from the path (everything after /download/)
    const key = req.params[0];

    if (!key) {
      return res.status(400).json({
        error: 'Missing required parameter',
        details: 'File key is required in the path',
      });
    }

    // Decode the key in case it's URL-encoded
    const decodedKey = decodeURIComponent(key);

    // Check if Railway Storage is configured
    if (!isStorageConfigured()) {
      return res.status(500).json({
        error: 'Storage not configured',
        details: 'Railway Storage is not configured. Please contact support.',
      });
    }

    // Generate presigned URL and redirect (will fail if file doesn't exist)
    const url = await getPresignedDownloadUrl(decodedKey, PRESIGNED_URL_EXPIRATION);
    res.redirect(302, url);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('Error redirecting to file:', err);
    res.status(500).json({
      error: 'Failed to access file',
      details: errorMessage,
    });
  }
});
*/

export default storageRouter;
