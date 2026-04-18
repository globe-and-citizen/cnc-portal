import express from 'express';
import { getWages, setWage, toggleWageStatus } from '../controllers/wageController';
import { requireTeamMember } from '../middleware/teamAuthzMiddleware';
import {
  validateBody,
  validateQuery,
  validateParamsAndQuery,
  setWageBodySchema,
  getWagesQuerySchema,
  toggleWageStatusParamsSchema,
  toggleWageStatusQuerySchema,
} from '../validation';

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
 *         maximumOvertimeHoursPerWeek:
 *           type: integer
 *           nullable: true
 *           description: Maximum overtime hours per week. Required when overtimeRatePerHour is provided.
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
 *                 minimum: 0
 *                 exclusiveMinimum: true
 *         overtimeRatePerHour:
 *           type: array
 *           nullable: true
 *           description: Overtime rate amount per hour by token type
 *           items:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 description: Rate type (e.g. native, usdc, sher)
 *               amount:
 *                 type: number
 *                 description: Overtime rate amount per hour
 *                 minimum: 0
 *                 exclusiveMinimum: true
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
 *                     exclusiveMinimum: true
 *             maximumOvertimeHoursPerWeek:
 *               type: integer
 *               nullable: true
 *               description: Required when overtimeRatePerHour is provided
 *               minimum: 1
 *             overtimeRatePerHour:
 *               type: array
 *               nullable: true
 *               description: Optional overtime rates applied after the weekly threshold is reached
 *               items:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     description: Rate type (e.g. native, usdc, sher)
 *                   amount:
 *                     type: number
 *                     description: Overtime rate amount per hour
 *                     minimum: 0
 *                     exclusiveMinimum: true
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
 *                 overtimeRatePerHour:
 *                   - type: "cash"
 *                     amount: 32
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
 *                   overtimeRatePerHour: null
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
wageRoutes.get(
  '/',
  validateQuery(getWagesQuerySchema),
  requireTeamMember('query.teamId'),
  getWages
);

/**
 * @openapi
 * /wage/{wageId}:
 *  put:
 *   summary: Toggle wage status (disable or enable)
 *   description: Disables or enables a member wage. A disabled wage prevents the member from submitting claims.
 *   parameters:
 *     - in: path
 *       name: wageId
 *       required: true
 *       schema:
 *         type: integer
 *         minimum: 1
 *       description: The ID of the wage to toggle
 *     - in: query
 *       name: action
 *       required: true
 *       schema:
 *         type: string
 *         enum: [disable, enable]
 *       description: Action to perform on the wage
 *   responses:
 *     200:
 *       description: Wage status updated successfully
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WageRecord'
 *     403:
 *       description: Forbidden - caller is not the owner of the team
 *     404:
 *       description: Wage not found
 *     500:
 *       description: Internal server error
 */
wageRoutes.put(
  '/:wageId',
  validateParamsAndQuery(toggleWageStatusParamsSchema, toggleWageStatusQuerySchema),
  toggleWageStatus
);

export default wageRoutes;
