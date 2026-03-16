import express from 'express';
import { getWages, setWage } from '../controllers/wageController';
import { validateBody, validateQuery, setWageBodySchema, getWagesQuerySchema } from '../validation';

const wageRoutes = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     WageRecord:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The ID of the wage record
 *         teamId:
 *           type: integer
 *           description: The ID of the team
 *         userAddress:
 *           type: string
 *           description: The Ethereum address of the user
 *         maximumHoursPerWeek:
 *           type: integer
 *           description: The maximum hours per week
 *         ratePerHour:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 description: Rate type (e.g. cash, token)
 *               amount:
 *                 type: number
 *                 description: Rate amount per hour
 *         previousWage:
 *           type: object
 *           description: The previous wage details
 *           nullable: true
 *           properties:
 *             id:
 *               type: number
 *               description: The previous wage ID
 */

/**
 * @openapi
 * /wage/setWage:
 *  put:
 *   summary: Set wage for a user
 *   description: Sets or updates the wage configuration for a team member including rates and maximum hours.
 *   requestBody:
 *     required: true
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           required:
 *             - teamId
 *             - userAddress
 *             - maximumHoursPerWeek
 *             - ratePerHour
 *           properties:
 *             teamId:
 *               type: integer
 *               description: The ID of the team
 *               minimum: 1
 *             userAddress:
 *               type: string
 *               description: The Ethereum address of the user
 *               pattern: "^0x[a-fA-F0-9]{40}$"
 *             maximumHoursPerWeek:
 *               type: integer
 *               description: The maximum hours per week
 *               minimum: 1
 *             ratePerHour:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     description: Rate type (e.g. cash, token)
 *                   amount:
 *                     type: number
 *                     description: Rate amount per hour
 *                     minimum: 0
 *   responses:
 *     201:
 *       description: Wage set successfully
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WageRecord'
 *           examples:
 *             example1:
 *               value:
 *                 id: 1
 *                 teamId: 5
 *                 userAddress: "0x1234567890abcdef1234567890abcdef12345678"
 *                 maximumHoursPerWeek: 40
 *                 ratePerHour:
 *                   - type: "cash"
 *                     amount: 25.50
 *                   - type: "token"
 *                     amount: 10
 *                 previousWage:
 *                   id: 0
 *     400:
 *       description: Bad request - invalid parameters or missing required fields
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     403:
 *       description: Forbidden - caller is not authorized to set wages
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     404:
 *       description: Member not found in the team
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
wageRoutes.put('/setWage', validateBody(setWageBodySchema), setWage);

/**
 * @openapi
 * /wage:
 *  get:
 *   summary: Get Team members wages
 *   description: Retrieves all wage records for members of a specific team.
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
 *               $ref: '#/components/schemas/WageRecord'
 *           examples:
 *             example1:
 *               value:
 *                 - id: 1
 *                   teamId: 5
 *                   userAddress: "0x1234567890abcdef1234567890abcdef12345678"
 *                   maximumHoursPerWeek: 40
 *                   ratePerHour:
 *                     - type: "cash"
 *                       amount: 25.50
 *                   previousWage: null
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
 *       description: Team not found
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
wageRoutes.get('/', validateQuery(getWagesQuerySchema), getWages);

export default wageRoutes;
