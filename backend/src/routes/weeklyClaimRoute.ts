import express from 'express';
import {
  getTeamWeeklyClaims,
  syncWeeklyClaims,
  updateWeeklyClaims,
} from '../controllers/weeklyClaimController';
import { requireTeamMember } from '../middleware/teamAuthzMiddleware';
import {
  validateQuery,
  validateParamsAndQuery,
  validateAll,
  getWeeklyClaimsQuerySchema,
  syncWeeklyClaimsQuerySchema,
  weeklyClaimIdParamsSchema,
  updateWeeklyClaimQuerySchema,
  updateWeeklyClaimBodySchema,
} from '../validation';

const weeklyClaimRoutes = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     WeeklyClaim:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The ID of the weekly claim
 *         teamId:
 *           type: integer
 *           description: The ID of the team
 *         memberAddress:
 *           type: string
 *           description: The Ethereum address of the member
 *         weekStart:
 *           type: string
 *           format: date-time
 *           description: The start date of the week (Monday)
 *         status:
 *           type: string
 *           enum: [pending, signed, withdrawn, disabled]
 *           description: The current status of the weekly claim
 *         signature:
 *           type: string
 *           description: The EIP-712 signature
 *           nullable: true
 *         minutesWorked:
 *           type: number
 *           description: Total minutes worked in the week (derived from individual claims)
 *         wage:
 *           type: object
 *           description: The associated wage record
 *         claims:
 *           type: array
 *           description: Individual claims within this weekly claim
 *           items:
 *             $ref: '#/components/schemas/Claim'
 *     SyncResult:
 *       type: object
 *       properties:
 *         teamId:
 *           type: integer
 *           description: The ID of the synced team
 *         totalProcessed:
 *           type: integer
 *           description: Total number of weekly claims processed
 *         updated:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               previousStatus:
 *                 type: string
 *               newStatus:
 *                 type: string
 *         skipped:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               reason:
 *                 type: string
 */

/**
 * @openapi
 * /weekly-claim:
 *  get:
 *   summary: Get weekly claims for a team
 *   description: Retrieves weekly claims for a specific team with optional filtering by status and member address.
 *   parameters:
 *     - in: query
 *       name: teamId
 *       required: true
 *       schema:
 *         type: integer
 *         minimum: 1
 *       description: The ID of the team
 *     - in: query
 *       name: status
 *       schema:
 *         type: string
 *         enum: [pending, signed, withdrawn, disabled]
 *       description: Filter by weekly claim status
 *     - in: query
 *       name: userAddress
 *       schema:
 *         type: string
 *         pattern: "^0x[a-fA-F0-9]{40}$"
 *       description: Filter by member Ethereum address
 *     - in: query
 *       name: memberAddress
 *       schema:
 *         type: string
 *         pattern: "^0x[a-fA-F0-9]{40}$"
 *       description: Filter by member Ethereum address (alias for userAddress)
 *     - in: query
 *       name: address
 *       schema:
 *         type: string
 *         pattern: "^0x[a-fA-F0-9]{40}$"
 *       description: Filter by member Ethereum address (alias for userAddress)
 *   responses:
 *     200:
 *       description: Weekly claims retrieved successfully
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/WeeklyClaim'
 *     400:
 *       description: Bad request - invalid or missing teamId, invalid status or address
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     403:
 *       description: Forbidden - caller is not a member of the team
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     500:
 *       description: Internal server error
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 */
weeklyClaimRoutes.get(
  '/',
  validateQuery(getWeeklyClaimsQuerySchema),
  requireTeamMember('query.teamId'),
  getTeamWeeklyClaims
);

/**
 * @openapi
 * /weekly-claim/sync:
 *  post:
 *   summary: Sync weekly claims with smart contract state
 *   description: Synchronizes weekly claim statuses against the on-chain CashRemunerationEIP712 contract to detect paid or disabled claims.
 *   parameters:
 *     - in: query
 *       name: teamId
 *       required: true
 *       schema:
 *         type: integer
 *         minimum: 1
 *       description: The ID of the team to sync
 *   responses:
 *     200:
 *       description: Sync completed successfully
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SyncResult'
 *           examples:
 *             example1:
 *               value:
 *                 teamId: 5
 *                 totalProcessed: 10
 *                 updated:
 *                   - id: 1
 *                     previousStatus: "signed"
 *                     newStatus: "withdrawn"
 *                 skipped:
 *                   - id: 3
 *                     reason: "Missing or invalid signature"
 *     400:
 *       description: Bad request - invalid or missing teamId
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     403:
 *       description: Forbidden - caller is not a member of the team
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     404:
 *       description: Cash Remuneration contract not found for the team
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     500:
 *       description: Internal server error
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 */
weeklyClaimRoutes.post(
  '/sync',
  validateQuery(syncWeeklyClaimsQuerySchema),
  requireTeamMember('query.teamId'),
  syncWeeklyClaims
);

/**
 * @openapi
 * /weekly-claim/{id}:
 *  put:
 *   summary: Update a weekly claim
 *   description: Performs an action on a weekly claim (sign, withdraw, enable, or disable). Requires appropriate permissions.
 *   parameters:
 *     - in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: integer
 *         minimum: 1
 *       description: The ID of the weekly claim
 *     - in: query
 *       name: action
 *       required: true
 *       schema:
 *         type: string
 *         enum: [sign, withdraw, disable, enable]
 *       description: The action to perform on the weekly claim
 *   requestBody:
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             signature:
 *               type: string
 *               description: The EIP-712 signature (required for sign and enable actions)
 *   responses:
 *     200:
 *       description: Weekly claim updated successfully
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WeeklyClaim'
 *     400:
 *       description: Bad request - invalid action, missing signature, or invalid claim state
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     403:
 *       description: Forbidden - caller is not the Cash Remuneration owner or team owner
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     404:
 *       description: Weekly claim not found
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     500:
 *       description: Internal server error
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 */
weeklyClaimRoutes.put(
  '/:id',
  validateAll(
    updateWeeklyClaimBodySchema,
    updateWeeklyClaimQuerySchema,
    weeklyClaimIdParamsSchema
  ),
  updateWeeklyClaims
);

export default weeklyClaimRoutes;
