import express from 'express';
import { authenticateSiwe, authenticateToken } from '../controllers/authController';
import { authorizeUser } from '../middleware/authMiddleware';
import { validateBody, siweAuthRequestSchema } from '../validation';

const authRoutes = express.Router();

/**
 * @openapi
 * /auth/siwe:
 *   post:
 *     summary: Authenticate using Sign-In with Ethereum (SIWE)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: The SIWE message to be verified
 *                 example: "localhost wants you to sign in with your Ethereum account:\n0x..."
 *               signature:
 *                 type: string
 *                 description: The signature of the SIWE message
 *                 pattern: "^0x[a-fA-F0-9]{130}$"
 *                 example: "0x1234567890abcdef..."
 *             required:
 *               - message
 *               - signature
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: JWT access token for authenticated requests
 *       400:
 *         description: Validation error or invalid SIWE message/signature
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message
 *       401:
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Authentication error message
 *       500:
 *         description: Internal server error
 */
authRoutes.post('/siwe', validateBody(siweAuthRequestSchema), authenticateSiwe);

/**
 * @openapi
 * /auth/token:
 *   get:
 *     summary: Validate JWT token
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *       401:
 *         description: Token is invalid or missing
 */
authRoutes.get('/token', authorizeUser, authenticateToken);

export default authRoutes;
