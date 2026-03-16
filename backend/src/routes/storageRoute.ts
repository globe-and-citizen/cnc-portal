// routes/storageRoute.ts
import express from 'express';
import { authorizeUser } from '../middleware/authMiddleware';
import { validateQuery, getPresignedUrlQuerySchema } from '../validation';
import { getFileUrl } from '../controllers/storageController';

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
 *         description: Bad request - missing or invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: File not found in storage
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error - storage not configured or URL generation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
storageRouter.get('/url', authorizeUser, validateQuery(getPresignedUrlQuerySchema), getFileUrl);

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
