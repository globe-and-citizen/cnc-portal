import express from 'express';
import { signBuilderMessage, fetchMarketData } from '../controllers/polymarketController';
import { signRequestSchema, gammaPathSchema, validateBody, validateQuery } from '../validation';

const polymarketRoutes = express.Router();

/**
 * @openapi
 * /api/polymarket/sign:
 *   post:
 *     summary: Sign messages for Polymarket Builder authentication
 *     description: Receives request details and returns the HMAC signature and builder credentials required for RelayClient or ClobClient.
 *     tags:
 *       - Polymarket
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - method
 *               - path
 *               - body
 *             properties:
 *               method:
 *                 type: string
 *                 description: HTTP method of the request to be signed (e.g., POST, GET)
 *                 example: "POST"
 *               path:
 *                 type: string
 *                 description: The API endpoint path being called
 *                 example: "/order"
 *               body:
 *                 type: string
 *                 description: The stringified JSON request body
 *                 example: '{"marketId":"0x123..."}'
 *     responses:
 *       200:
 *         description: Successfully generated signature
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 POLY_BUILDER_SIGNATURE:
 *                   type: string
 *                   example: "0xabc123..."
 *                 POLY_BUILDER_TIMESTAMP:
 *                   type: string
 *                   example: "1735645560000"
 *                 POLY_BUILDER_API_KEY:
 *                   type: string
 *                   example: "your-api-key"
 *                 POLY_BUILDER_PASSPHRASE:
 *                   type: string
 *                   example: "your-passphrase"
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Configuration error or signing failure
 */
polymarketRoutes.post('/sign', validateBody(signRequestSchema), signBuilderMessage);
polymarketRoutes.get('/market-data', validateQuery(gammaPathSchema), fetchMarketData);

export default polymarketRoutes;
