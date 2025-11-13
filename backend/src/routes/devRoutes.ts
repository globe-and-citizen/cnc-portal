import express from 'express';
import { generateSiweSignature, devHealthCheck } from '../controllers/devController';

const devRoutes = express.Router();

/**
 * Middleware to ensure dev routes are only available in development mode
 */
const devModeOnly = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({
      success: false,
      error: 'Development endpoints are only available in development mode',
      environment: process.env.NODE_ENV || 'unknown',
    });
  }
  next();
};

// Apply dev mode middleware to all routes
devRoutes.use(devModeOnly);

/**
 * @swagger
 * /api/dev/health:
 *   get:
 *     summary: Health check for dev controller
 *     description: Verifies that the dev controller is available (development mode only)
 *     tags: [Development]
 *     responses:
 *       200:
 *         description: Dev controller is available
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Dev controller is available"
 *                 environment:
 *                   type: string
 *                   example: "development"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       403:
 *         description: Not available in production mode
 */
devRoutes.get('/health', devHealthCheck);

/**
 * @swagger
 * /api/dev/generate-siwe-signature:
 *   post:
 *     summary: Generate SIWE message and signature
 *     description: Generates a SIWE (Sign-In with Ethereum) message and signature for testing purposes (development mode only)
 *     tags: [Development]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messageParams
 *               - privateKey
 *             properties:
 *               messageParams:
 *                 type: object
 *                 required:
 *                   - nonce
 *                   - address
 *                   - domain
 *                   - chainId
 *                 properties:
 *                   nonce:
 *                     type: string
 *                     description: Random nonce for the SIWE message
 *                     example: "32891756"
 *                   address:
 *                     type: string
 *                     description: Ethereum address
 *                     example: "0x1234567890123456789012345678901234567890"
 *                   domain:
 *                     type: string
 *                     description: Domain of the application
 *                     example: "localhost"
 *                   chainId:
 *                     type: number
 *                     description: Blockchain chain ID
 *                     example: 1337
 *                   statement:
 *                     type: string
 *                     description: Optional statement
 *                     example: "I accept the Terms of Service"
 *                   uri:
 *                     type: string
 *                     description: Optional URI
 *                     example: "http://localhost:3000"
 *               privateKey:
 *                 type: string
 *                 description: Private key to sign with (hex string starting with 0x)
 *                 example: "0x1234567890123456789012345678901234567890123456789012345678901234"
 *     responses:
 *       200:
 *         description: Successfully generated SIWE message and signature
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   description: The generated SIWE message
 *                 signature:
 *                   type: string
 *                   description: The signature of the message
 *                 address:
 *                   type: string
 *                   description: The address that signed the message
 *                 nonce:
 *                   type: string
 *                   description: The nonce used in the message
 *                 issuedAt:
 *                   type: string
 *                   format: date-time
 *                   description: When the message was issued
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   description: When the operation was performed
 *       400:
 *         description: Bad request - missing or invalid parameters
 *       403:
 *         description: Not available in production mode
 *       500:
 *         description: Internal server error
 */
devRoutes.post('/generate-siwe-signature', generateSiweSignature);

export default devRoutes;
