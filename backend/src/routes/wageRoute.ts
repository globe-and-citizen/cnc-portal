import express from "express";
import { getWages, setWage } from "../controllers/wageController";

const wageRoutes = express.Router();

/**
 * @openapi
 * /wage/setWage:
 *  put:
 *   summary: Set wage for a user
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
 *             userAddress:
 *               type: string
 *               description: The address of the user
 *               pattern: "^0x[a-fA-F0-9]{40}$"
 *             cashRatePerHour:
 *               type: number
 *               description: The cash rate per hour
 *               minimum: 0
 *             tokenRatePerHour:
 *               type: number
 *               description: The token rate per hour
 *               minimum: 0
 *             maximumHoursPerWeek:
 *               type: integer
 *               description: The maximum hours per week
 *               minimum: 1
 *   responses:
 *     201:
 *       description: Wage set successfully
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *                 description: The ID of the wage record
 *               teamId:
 *                 type: integer
 *                 description: The ID of the team
 *               userAddress:
 *                 type: string
 *                 description: The address of the user
 *               cashRatePerHour:
 *                 type: number
 *                 description: The cash rate per hour
 *               tokenRatePerHour:
 *                 type: number
 *                 description: The token rate per hour
 *               maximumHoursPerWeek:
 *                 type: integer
 *                 description: The maximum hours per week
 *               previousWage:
 *                 type: object
 *                 description: The previous wage details
 *                 properties:
 *                   id:
 *                     type: number
 *                     description: The previous rate ID
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
 *     404:
 *       description: Member not found in the team
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: Error message indicating the member was not found in the team
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
wageRoutes.put("/setWage", setWage);

/**
 * @openapi
 * /wage:
 *  get:
 *   summary: Get Team members wages
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
 *       description: Wages retrieved successfully
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   description: The ID of the wage record
 *                 teamId:
 *                   type: integer
 *                   description: The ID of the team
 *                 userAddress:
 *                   type: string
 *                   description: The address of the user
 *                 cashRatePerHour:
 *                   type: number
 *                   description: The cash rate per hour
 *                 tokenRatePerHour:
 *                   type: number
 *                   description: The token rate per hour
 *                 maximumHoursPerWeek:
 *                   type: integer
 *                   description: The maximum hours per week
 *                 previousWage:
 *                   type: object
 *                   description: The previous wage details
 *                   properties:
 *                     id:
 *                       type: number
 *                       description: The previous wage ID
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
 *     404:
 *       description: Team not found
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: Error message indicating the team was not found
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
wageRoutes.get("/", getWages);

export default wageRoutes;
