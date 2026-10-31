import express from 'express';
import { addExpense, getExpenses } from '../controllers/expenseController';
import { rejectIfArchived, requireTeamMember } from '../middleware/teamAuthzMiddleware';
import {
  addExpenseBodySchema,
  getExpensesQuerySchema,
  validateBody,
  validateQuery,
} from '../validation';

const expenseRoutes = express.Router();

/**
 * @openapi
 * /expense:
 *  post:
 *   summary: Add a new expense
 *   tags: [Expenses]
 *   security:
 *     - bearerAuth: []
 *   requestBody:
 *     required: true
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             teamId:
 *               type: string
 *               description: The ID of the team
 *             signature:
 *               type: string
 *               description: The signature of the expense
 *             data:
 *               type: string
 *               description: The expense data
 *   responses:
 *     201:
 *       description: Expense created successfully
 *     400:
 *       description: Bad request
 *     500:
 *       description: Internal server error
 */
expenseRoutes.post(
  '/',
  validateBody(addExpenseBodySchema),
  rejectIfArchived('body.teamId'),
  addExpense
);

/**
 * @openapi
 * /expense:
 *  get:
 *   summary: Get expenses for a team
 *   tags: [Expenses]
 *   security:
 *     - bearerAuth: []
 *   parameters:
 *     - in: query
 *       name: teamId
 *       required: true
 *       schema:
 *         type: string
 *         description: The ID of the team
 *   responses:
 *     200:
 *       description: Expenses retrieved successfully
 *     400:
 *       description: Bad request
 *     403:
 *       description: Caller is not a member of the team
 *     500:
 *       description: Internal server error
 */
expenseRoutes.get(
  '/',
  validateQuery(getExpensesQuerySchema),
  requireTeamMember('query.teamId'),
  getExpenses
);

export default expenseRoutes;
