import express from "express";
import {
  addClaim,
  getClaims,
  monthlyPendingClaims,
  updateClaim,
} from "../controllers/claimController";

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
claimRoutes.post("/", addClaim);

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
claimRoutes.get("/", getClaims);

/**
 * @openapi
 * /claim/{claimId}:
 *  put:
 *   summary: Update a claim's status or perform actions like signing, withdrawing, disabling, enabling, or rejecting
 *   parameters:
 *     - in: path
 *       name: claimId
 *       required: true
 *       schema:
 *         type: integer
 *         description: The ID of the claim to update
 *         minimum: 1
 *     - in: query
 *       name: action
 *       required: true
 *       schema:
 *         type: string
 *         enum: [sign, withdraw, disable, enable, reject]
 *         description: The action to perform on the claim
 *   requestBody:
 *     required: true
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             signature:
 *               type: string
 *               description: The signature for signing the claim (required for 'sign' action)
 *   responses:
 *     200:
 *       description: Claim updated successfully
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
claimRoutes.put("/:claimId", updateClaim);

/**
 * @openapi
 * /claim/monthly-pending-claims:
 *   get:
 *     summary: Retrieve the total number of pending claims in current month
 *     responses:
 *       200:
 *         description: Monthly pending claims retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalAmount:
 *                   type: number
 *                   description: The total amount of pending claims in the current month
 *               example:
 *                 totalAmount: 1000
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message detailing the internal server error
 *             example:
 *               message: "Internal server error"
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message detailing the forbidden access
 *             example:
 *               message: "Caller is not a member of the team"
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message detailing the bad request
 *             example:
 *               message: "Invalid or missing teamId"
 */
claimRoutes.get("/monthly-pending-claims", monthlyPendingClaims);

export default claimRoutes;
