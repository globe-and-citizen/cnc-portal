import express from 'express';
import { addClaim, getClaims, updateClaim, deleteClaim } from '../controllers/claimController';
import {
  validateBody,
  validateQuery,
  validateBodyAndParams,
  validateParams,
  addClaimBodySchema,
  getClaimsQuerySchema,
  updateClaimBodySchema,
  claimIdParamsSchema,
} from '../validation';

const claimRoutes = express.Router();
/**
 * @openapi
 * components:
 *   schemas:
 *     Claim:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The ID of the claim
 *         status:
 *           type: string
 *           description: The status of the claim
 *         hoursWorked:
 *           type: integer
 *           description: The number of hours worked
 *         signature:
 *           type: string
 *           description: The signature of the claim
 *           nullable: true
 *         tokenTx:
 *           type: string
 *           description: The token transaction hash
 *           nullable: true
 *         wageId:
 *           type: integer
 *           description: The ID of the associated wage
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The timestamp when the claim was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The timestamp when the claim was last updated
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Error message
 *     Wage:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The ID of the wage
 *         teamId:
 *           type: integer
 *           description: The ID of the team
 */

/**
 * @openapi
 * /claim:
 *  post:
 *   summary: Add a claim for hours worked
 *   requestBody:
 *     required: true
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             teamId:
 *               type: integer
 *               description: The ID of the team
 *               minimum: 1
 *             hoursWorked:
 *               type: number
 *               description: The number of hours worked
 *               minimum: 1
 *   responses:
 *     201:
 *       description: Claim added successfully
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Claim'
 *     400:
 *       description: Bad request
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
claimRoutes.post('/', validateBody(addClaimBodySchema), addClaim);

/**
 * @openapi
 * /claim:
 *  get:
 *   summary: Retrieve claims for a specific team
 *   parameters:
 *     - in: query
 *       name: teamId
 *       required: true
 *       schema:
 *         type: integer
 *         description: The ID of the team
 *         minimum: 1
 *   responses:
 *     200:
 *       description: List of claims retrieved successfully
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/Claim'
 *     400:
 *       description: Bad request
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: Error message detailing the bad request
 *     403:
 *       description: Forbidden
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
claimRoutes.get('/', validateQuery(getClaimsQuerySchema), getClaims);


/**
 * @openapi
 * /claim/{claimId}:
 *  put:
 *   summary: Update claim details (hours worked, memo, or date)
 *   description: Allows the claim owner to edit their own pending claim details.
 *   parameters:
 *     - in: path
 *       name: claimId
 *       required: true
 *       schema:
 *         type: integer
 *         description: The ID of the claim to edit
 *         minimum: 1
 *   requestBody:
 *     required: true
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             hoursWorked:
 *               type: number
 *               minimum: 1
 *               maximum: 24
 *               description: Updated number of hours worked
 *             memo:
 *               type: string
 *               description: Optional memo for the claim
 *               maxLength: 200
 *             dayWorked:
 *               type: string
 *               format: date
 *               description: Updated work date (UTC)
 *   responses:
 *     200:
 *       description: Claim details updated successfully
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Claim'
 *     400:
 *       description: Bad request
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     403:
 *       description: Forbidden
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     404:
 *       description: Claim not found
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
claimRoutes.put(
  '/:claimId',
  validateBodyAndParams(updateClaimBodySchema, claimIdParamsSchema),
  updateClaim
)

/**
 * @openapi
 * /claim/{claimId}:
 *  delete:
 *   summary: Delete a pending claim
 *   description: Allows the claim owner to delete their own pending claim.
 *   parameters:
 *     - in: path
 *       name: claimId
 *       required: true
 *       schema:
 *         type: integer
 *         description: The ID of the claim to delete
 *         minimum: 1
 *   responses:
 *     200:
 *       description: Claim deleted successfully
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: Claim deleted successfully
 *     400:
 *       description: Bad request
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     403:
 *       description: Forbidden
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     404:
 *       description: Claim not found
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
claimRoutes.delete('/:claimId', validateParams(claimIdParamsSchema), deleteClaim);
export default claimRoutes;
