import express from 'express';
import { addExpense, getExpenses, updateExpense } from '../controllers/expenseController';
import {
  addExpenseBodySchema,
  getExpensesQuerySchema,
  updateExpenseBodySchema,
  updateExpenseParamsSchema,
  validateBody,
  validateBodyAndParams,
  validateQuery
} from '../validation';

const expenseRoutes = express.Router();

/**
 * @openapi
 * /expense:
 *  post:
 *   summary: Add a new expense
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
expenseRoutes.post('/', validateBody(addExpenseBodySchema), addExpense);

/**
 * @openapi
 * /expense:
 *  get:
 *   summary: Get expenses for a team
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
expenseRoutes.get('/', validateQuery(getExpensesQuerySchema), getExpenses);

/**
 * @openapi
 * /expense/{id}:
 *  patch:
 *   summary: Update an expense
 *   parameters:
 *     - in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: integer
 *         description: The ID of the expense
 *   requestBody:
 *     required: true
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             status:
 *               type: string
 *               enum: [disable, expired, limitReached]
 *               description: The new status of the expense
 *   responses:
 *     200:
 *       description: Expense updated successfully
 *     400:
 *       description: Bad request
 *     403:
 *       description: Caller is not authorized
 *     500:
 *       description: Internal server error
 */
expenseRoutes.patch(
  '/:id',
  validateBodyAndParams(updateExpenseBodySchema, updateExpenseParamsSchema),
  updateExpense
);

export default expenseRoutes;
