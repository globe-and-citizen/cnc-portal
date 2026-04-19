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

export default storageRouter;
