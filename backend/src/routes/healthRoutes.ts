import express from 'express';
import { healthCheck } from '../controllers/healthController';
import { validateQuery, healthCheckQuerySchema } from '../validation';

const healthRoutes = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     HealthCheckResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Whether the health check was successful
 *           example: true
 *         status:
 *           type: string
 *           description: Service health status
 *           example: "healthy"
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: Timestamp of the health check
 *           example: "2024-01-15T10:30:00.000Z"
 *         service:
 *           type: string
 *           description: Name of the service being checked
 *           example: "backend"
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Error message
 */

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: |
 *       Lightweight endpoint to verify that the backend service is running and responsive.
 *       This endpoint is useful for:
 *       - Waking up serverless deployments
 *       - Load balancer health checks
 *       - Monitoring and alerting systems
 *       - CI/CD deployment verification
 *
 *       No authentication is required for this endpoint.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy and responsive
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheckResponse'
 *             examples:
 *               healthyService:
 *                 value:
 *                   success: true
 *                   status: "healthy"
 *                   timestamp: "2024-01-15T10:30:00.000Z"
 *                   service: "backend"
 *       500:
 *         description: Internal server error - service is unhealthy or unable to respond
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               serviceDown:
 *                 value:
 *                   message: "Service unavailable"
 *       400:
 *         description: Bad request - invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - insufficient permissions to access this health endpoint
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Not found - health endpoint was not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
healthRoutes.get('/', validateQuery(healthCheckQuerySchema), healthCheck);

export default healthRoutes;
