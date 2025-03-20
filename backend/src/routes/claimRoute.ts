import express from "express";
import {
  addClaim,
  getClaims,
  signeClaim,
  withdrawClaim,
} from "../controllers/claimController";

const claimRoutes = express.Router();

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
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *                 description: The ID of the claim
 *               hoursWorked:
 *                 type: number
 *                 description: The number of hours worked
 *               wageId:
 *                 type: integer
 *                 description: The ID of the associated wage
 *               status:
 *                 type: string
 *                 description: The status of the claim
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
 *     500:
 *       description: Internal server error
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: Error message indicating an internal server error
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
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   description: The ID of the claim
 *                 hoursWorked:
 *                   type: number
 *                   description: The number of hours worked
 *                 wageId:
 *                   type: integer
 *                   description: The ID of the associated wage
 *                 status:
 *                   type: string
 *                   description: The status of the claim
 *                 wage:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: The ID of the wage
 *                     teamId:
 *                       type: integer
 *                       description: The ID of the team
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
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: Error message indicating lack of permissions
 *     500:
 *       description: Internal server error
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: Error message indicating an internal server error
 */
claimRoutes.get("/", getClaims);

/**
 * @openapi
 * /claim/{claimId}/signe:
 *  put:
 *   summary: Sign a claim
 *   parameters:
 *     - in: path
 *       name: claimId
 *       required: true
 *       schema:
 *         type: integer
 *         description: The ID of the claim to sign
 *         minimum: 1
 *   requestBody:
 *     required: true
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             signature:
 *               type: string
 *               description: The signature for the claim
 *   responses:
 *     200:
 *       description: Claim signed successfully
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *                 description: The ID of the claim
 *               status:
 *                 type: string
 *                 description: The updated status of the claim
 *               signature:
 *                 type: string
 *                 description: The signature of the claim
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
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: Error message indicating lack of permissions
 *     500:
 *       description: Internal server error
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: Error message indicating an internal server error
 */
claimRoutes.put("/:claimId/signe", signeClaim);

claimRoutes.put("/:claimId/withdrawn", withdrawClaim);

export default claimRoutes;
