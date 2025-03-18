import express from "express";
import { addClaim } from "../controllers/claimController";

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

export default claimRoutes;
