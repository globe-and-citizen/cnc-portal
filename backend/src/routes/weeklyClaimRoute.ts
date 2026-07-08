import express from 'express';
import {
  getTeamWeeklyClaims,
  submitWeeklyGoals,
  syncWeeklyClaims,
  updateWeeklyClaims,
} from '../controllers/weeklyClaimController';
import { rejectIfArchived, requireTeamMember } from '../middleware/teamAuthzMiddleware';
import {
  validate,
  validateBody,
  validateQuery,
  getWeeklyClaimsQuerySchema,
  submitWeeklyGoalsBodySchema,
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
 *   tags: [Weekly Claims]
 *   security:
 *     - bearerAuth: []
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
 *   tags: [Weekly Claims]
 *   security:
 *     - bearerAuth: []
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
  rejectIfArchived('query.teamId'),
  syncWeeklyClaims
);

/**
 * @openapi
 * /weekly-claim/goals:
 *  put:
 *   summary: Submit or update the caller's weekly goals memo
 *   tags: [Weekly Claims]
 *   security:
 *     - bearerAuth: []
 *   description: |
 *     Upserts the authenticated member's free-form Markdown goals memo for a
 *     given ISO week. Exactly one memo exists per weekly claim. Submitting goals
 *     for a week with no claims yet creates a claim-less weekly claim (status
 *     `pending`). The memo is locked once the week is signed, withdrawn, or
 *     disabled.
 *   requestBody:
 *     required: true
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           required: [teamId, weekStart, weeklyGoals]
 *           properties:
 *             teamId:
 *               type: integer
 *               minimum: 1
 *             weekStart:
 *               type: string
 *               format: date-time
 *               description: Any ISO datetime within the target week (normalized to the Monday isoWeek start).
 *             weeklyGoals:
 *               type: string
 *               maxLength: 10000
 *               description: Markdown memo. An empty string clears the saved memo.
 *   responses:
 *     200:
 *       description: Weekly goals saved successfully
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WeeklyClaim'
 *     400:
 *       description: Bad request - invalid body or no wage for the caller
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
 *     409:
 *       description: Conflict - the week is already signed, withdrawn, or disabled
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
  '/goals',
  validateBody(submitWeeklyGoalsBodySchema),
  requireTeamMember('body.teamId'),
  rejectIfArchived('body.teamId'),
  submitWeeklyGoals
);

/**
 * @openapi
 * /weekly-claim/{id}:
 *  put:
 *   summary: Update a weekly claim
 *   tags: [Weekly Claims]
 *   security:
 *     - bearerAuth: []
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
 *               description: The EIP-712 signature. Required for `action=sign` and `action=enable`.
 *             signedAgainstContractAddress:
 *               type: string
 *               description: |
 *                 EIP-712 verifyingContract the signature was bound to. Required for
 *                 `action=sign`. The backend validates this matches the team's current
 *                 CashRemunerationEIP712 (scoped to the current Officer) and persists it
 *                 on the row so post-redeploy stale-detection works without a sweep.
 *             chainId:
 *               type: integer
 *               description: Chain ID the signature was produced on. Required for `action=sign`.
 *             typedDataMessage:
 *               type: object
 *               description: |
 *                 The EIP-712 WageClaim message envelope as signed. Required for
 *                 `action=sign`. The backend rebuilds the typed data from this envelope
 *                 plus `signedAgainstContractAddress`/`chainId` and runs
 *                 `recoverTypedDataAddress` to confirm the signer is the caller.
 *               required: [employeeAddress, minutesWorked, date, wages]
 *               properties:
 *                 employeeAddress:
 *                   type: string
 *                 minutesWorked:
 *                   type: integer
 *                   minimum: 0
 *                   maximum: 65535
 *                 date:
 *                   type: string
 *                   description: Stringified unsigned integer (Unix seconds — JSON can't carry bigint).
 *                 wages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     required: [hourlyRate, tokenAddress]
 *                     properties:
 *                       hourlyRate:
 *                         type: string
 *                         description: Stringified unsigned integer (wei).
 *                       tokenAddress:
 *                         type: string
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
  validate({
    params: weeklyClaimIdParamsSchema,
    query: updateWeeklyClaimQuerySchema,
    body: updateWeeklyClaimBodySchema,
  }),
  rejectIfArchived('params.weeklyClaimId'),
  updateWeeklyClaims
);

export default weeklyClaimRoutes;
