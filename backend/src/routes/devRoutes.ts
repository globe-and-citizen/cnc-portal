import express from 'express';
import { generateSiweSignature, devHealthCheck } from '../controllers/devController';
import {
  validateBody,
  validateQuery,
  generateSiweSignatureBodySchema,
  devHealthQuerySchema,
} from '../validation';

const devRoutes = express.Router();

/**
 * Middleware to ensure dev routes are only available in development mode
 */
const devModeOnly = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({
      message: 'Development endpoints are only available in development mode',
    });
  }
  next();
};

// Apply dev mode middleware to all routes
devRoutes.use(devModeOnly);

/**
 * @openapi
 * components:
 *   schemas:
 *     DevHealthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Whether the dev controller is available
 *           example: true
 *         message:
 *           type: string
 *           description: Status message
 *           example: "Dev controller is available"
 *         environment:
 *           type: string
 *           description: Current environment
 *           example: "development"
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: Timestamp of the health check
 *           example: "2024-01-15T10:30:00.000Z"
 *     SiweMessageParams:
 *       type: object
 *       required:
 *         - nonce
 *         - address
 *         - domain
 *         - chainId
 *       properties:
 *         nonce:
 *           type: string
 *           description: Random nonce for the SIWE message
 *           example: "32891756"
 *         address:
 *           type: string
 *           pattern: '^0x[a-fA-F0-9]{40}$'
 *           description: Ethereum address (must match private key)
 *           example: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
 *         domain:
 *           type: string
 *           description: Domain of the application
 *           example: "localhost"
 *         chainId:
 *           type: integer
 *           description: Blockchain chain ID
 *           example: 1337
 *         statement:
 *           type: string
 *           description: Optional statement for the user to sign
 *           example: "I accept the Terms of Service"
 *         uri:
 *           type: string
 *           format: uri
 *           description: Optional URI of the application
 *           example: "http://localhost:3000"
 *     DevSignatureResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Whether the operation was successful
 *           example: true
 *         message:
 *           type: string
 *           description: The generated SIWE message
 *           example: "localhost wants you to sign in with your Ethereum account:\n0x70997970C51812dc3A010C7d01b50e0d17dc79C8\n\nI accept the Terms of Service\n\nURI: http://localhost:3000\nVersion: 1\nChain ID: 1337\nNonce: 32891756\nIssued At: 2024-01-15T10:30:00.000Z"
 *         signature:
 *           type: string
 *           pattern: '^0x[a-fA-F0-9]{130}$'
 *           description: The signature of the SIWE message
 *           example: "0x1234567890abcdef..."
 *         address:
 *           type: string
 *           pattern: '^0x[a-fA-F0-9]{40}$'
 *           description: The address that signed the message
 *           example: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
 *         nonce:
 *           type: string
 *           description: The nonce used in the message
 *           example: "32891756"
 *         issuedAt:
 *           type: string
 *           format: date-time
 *           description: When the message was issued
 *           example: "2024-01-15T10:30:00.000Z"
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: When the operation was performed
 *           example: "2024-01-15T10:30:00.123Z"
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Error message
 *     DevErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *           description: Error message
 *         environment:
 *           type: string
 *           description: Current environment
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: Timestamp of the error
 */

/**
 * @openapi
 * /dev/health:
 *   get:
 *     summary: Health check for dev controller
 *     description: Verifies that the dev controller is available. This endpoint is only accessible when NODE_ENV is set to 'development'.
 *     tags: [Development]
 *     responses:
 *       200:
 *         description: Dev controller is available and healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DevHealthResponse'
 *             examples:
 *               success:
 *                 value:
 *                   success: true
 *                   message: "Dev controller is available"
 *                   environment: "development"
 *                   timestamp: "2024-01-15T10:30:00.000Z"
 *       403:
 *         description: Forbidden - endpoint not available in production mode
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               notDevelopment:
 *                 value:
 *                   message: "Development endpoints are only available in development mode"
 *       400:
 *         description: Bad request - invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Not found - development health endpoint was not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
devRoutes.get('/health', validateQuery(devHealthQuerySchema), devHealthCheck);

/**
 * @openapi
 * /dev/generate-siwe-signature:
 *   post:
 *     summary: Generate SIWE message and signature for testing
 *     description: |
 *       Generates a Sign-In with Ethereum (SIWE) message and signature for testing purposes.
 *       This endpoint is only available when NODE_ENV is set to 'development'.
 *
 *       ** WARNING: Never use this endpoint in production or with real private keys!**
 *
 *       This endpoint is designed for:
 *       - Local development testing
 *       - Automated test suites
 *       - API testing with tools like Bruno or Postman
 *
 *       Use test private keys only (e.g., from Hardhat's default accounts).
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
 *                 $ref: '#/components/schemas/SiweMessageParams'
 *               privateKey:
 *                 type: string
 *                 pattern: '^0x[a-fA-F0-9]{64}$'
 *                 description: Private key to sign with (must start with 0x, 64 hex chars)
 *                 example: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
 *           examples:
 *             basicRequest:
 *               summary: Basic SIWE signature generation
 *               value:
 *                 messageParams:
 *                   nonce: "32891756"
 *                   address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
 *                   domain: "localhost"
 *                   chainId: 1337
 *                 privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
 *             withStatement:
 *               summary: With statement and URI
 *               value:
 *                 messageParams:
 *                   nonce: "32891756"
 *                   address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
 *                   domain: "localhost"
 *                   chainId: 1337
 *                   statement: "I accept the Terms of Service"
 *                   uri: "http://localhost:3000"
 *                 privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
 *     responses:
 *       200:
 *         description: Successfully generated SIWE message and signature
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DevSignatureResponse'
 *             examples:
 *               success:
 *                 value:
 *                   success: true
 *                   message: "localhost wants you to sign in with your Ethereum account:\n0x70997970C51812dc3A010C7d01b50e0d17dc79C8\n\nI accept the Terms of Service\n\nURI: http://localhost:3000\nVersion: 1\nChain ID: 1337\nNonce: 32891756\nIssued At: 2024-01-15T10:30:00.000Z"
 *                   signature: "0x1234567890abcdef..."
 *                   address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
 *                   nonce: "32891756"
 *                   issuedAt: "2024-01-15T10:30:00.000Z"
 *                   timestamp: "2024-01-15T10:30:00.123Z"
 *       400:
 *         description: Bad request - missing or invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missingParams:
 *                 value:
 *                   message: "Missing messageParams in request body"
 *               missingPrivateKey:
 *                 value:
 *                   message: "Missing privateKey in request body"
 *               invalidPrivateKey:
 *                 value:
 *                   message: "Private key must start with 0x"
 *               invalidAddress:
 *                 value:
 *                   message: "Invalid Ethereum address format"
 *               addressMismatch:
 *                 value:
 *                   message: "Address does not match the provided private key"
 *               missingRequiredFields:
 *                 value:
 *                   message: "Missing required fields in messageParams: nonce, address, domain, chainId"
 *       403:
 *         description: Forbidden - endpoint not available in production mode
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               notDevelopment:
 *                 value:
 *                   message: "Development endpoints are only available in development mode"
 *       404:
 *         description: Not found - requested development resource was not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error - signature generation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               signatureError:
 *                 value:
 *                   message: "Failed to generate signature"
 */
devRoutes.post(
  '/generate-siwe-signature',
  validateBody(generateSiweSignatureBodySchema),
  generateSiweSignature
);

export default devRoutes;
