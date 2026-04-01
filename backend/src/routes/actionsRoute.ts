import express from 'express';
import { authorizeUser } from '../middleware/authMiddleware';
import { addAction, executeAction, getActions } from '../controllers/actionController';
import {
  validateBody,
  validateParams,
  validateQuery,
  addActionBodySchema,
  actionIdParamsSchema,
  getActionsQuerySchema,
} from '../validation';

const actionRoute = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     BoardAction:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The unique ID of the action
 *           example: 1
 *         teamId:
 *           type: integer
 *           description: The ID of the team
 *           example: 1
 *         actionId:
 *           type: integer
 *           description: The on-chain action ID
 *           example: 100
 *         description:
 *           type: string
 *           description: Human-readable description of the action
 *           example: "Add new member to the board"
 *         targetAddress:
 *           type: string
 *           pattern: '^0x[a-fA-F0-9]{40}$'
 *           description: The Ethereum address targeted by this action
 *           example: "0x1234567890123456789012345678901234567890"
 *         userAddress:
 *           type: string
 *           pattern: '^0x[a-fA-F0-9]{40}$'
 *           description: The address of the user who created the action
 *           example: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
 *         data:
 *           type: string
 *           description: Encoded contract call data
 *           example: "0x123456789abcdef"
 *         isExecuted:
 *           type: boolean
 *           description: Whether the action has been executed on-chain
 *           example: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the action was created
 *           example: "2024-01-15T10:30:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the action was last updated
 *           example: "2024-01-15T10:30:00.000Z"
 *     ActionListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/BoardAction'
 *         total:
 *           type: integer
 *           description: Total number of actions matching the query
 *           example: 15
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Error message
 */

/**
 * @openapi
 * /actions:
 *   get:
 *     summary: Get Board of Director actions for a team
 *     description: Retrieves all Board of Director actions for a specific team. Can optionally filter by execution status. Caller must be a team member.
 *     tags: [Board Actions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: teamId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: The ID of the team
 *         example: 1
 *       - in: query
 *         name: isExecuted
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Filter actions by execution status (true = executed only, false = pending only)
 *         example: false
 *     responses:
 *       200:
 *         description: Actions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ActionListResponse'
 *             examples:
 *               example1:
 *                 value:
 *                   data:
 *                     - id: 1
 *                       teamId: 1
 *                       actionId: 100
 *                       description: "Add new board member"
 *                       targetAddress: "0x1234567890123456789012345678901234567890"
 *                       userAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
 *                       data: "0x123456789abcdef"
 *                       isExecuted: false
 *                       createdAt: "2024-01-15T10:30:00.000Z"
 *                       updatedAt: "2024-01-15T10:30:00.000Z"
 *                   total: 1
 *       400:
 *         description: Bad request - invalid or missing teamId
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - missing or invalid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - caller is not a member of the team
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Not found - no Board of Director actions found for the provided team
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
actionRoute.get('/', authorizeUser, validateQuery(getActionsQuerySchema), getActions);

/**
 * @openapi
 * /actions:
 *   post:
 *     summary: Create a new Board of Director action
 *     description: Creates a new action for a Board of Directors contract. The action will be stored in the database and associated with the authenticated user.
 *     tags: [Board Actions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - teamId
 *               - actionId
 *               - description
 *               - targetAddress
 *               - data
 *             properties:
 *               teamId:
 *                 type: string
 *                 description: The ID of the team (will be converted to integer)
 *                 example: "1"
 *               actionId:
 *                 type: string
 *                 description: The on-chain action ID (will be converted to integer)
 *                 example: "100"
 *               description:
 *                 type: string
 *                 description: Human-readable description of the action
 *                 example: "Add new member to the board"
 *               targetAddress:
 *                 type: string
 *                 pattern: '^0x[a-fA-F0-9]{40}$'
 *                 description: The Ethereum address targeted by this action
 *                 example: "0x1234567890123456789012345678901234567890"
 *               data:
 *                 type: string
 *                 description: Encoded contract call data
 *                 example: "0x123456789abcdef"
 *           examples:
 *             addMemberAction:
 *               value:
 *                 teamId: "1"
 *                 actionId: "100"
 *                 description: "Add new board member"
 *                 targetAddress: "0x1234567890123456789012345678901234567890"
 *                 data: "0x123456789abcdef"
 *     responses:
 *       201:
 *         description: Action created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/BoardAction'
 *             examples:
 *               example1:
 *                 value:
 *                   data:
 *                     id: 1
 *                     teamId: 1
 *                     actionId: 100
 *                     description: "Add new board member"
 *                     targetAddress: "0x1234567890123456789012345678901234567890"
 *                     userAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
 *                     data: "0x123456789abcdef"
 *                     isExecuted: false
 *                     createdAt: "2024-01-15T10:30:00.000Z"
 *                     updatedAt: "2024-01-15T10:30:00.000Z"
 *       400:
 *         description: Bad request - missing required fields or invalid data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - missing or invalid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - caller does not have permission to create actions for this team
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Not found - the target team or contract context was not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
actionRoute.post('/', authorizeUser, validateBody(addActionBodySchema), addAction);

/**
 * @openapi
 * /actions/{id}:
 *   patch:
 *     summary: Mark an action as executed
 *     description: Updates an action's execution status to true. This endpoint is typically called after an action has been executed on-chain.
 *     tags: [Board Actions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: The ID of the action to mark as executed
 *         example: 1
 *     responses:
 *       200:
 *         description: Action marked as executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example: {}
 *       400:
 *         description: Bad request - action ID is empty or not set
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               emptyId:
 *                 value:
 *                   message: "Action ID empty or not set"
 *       401:
 *         description: Unauthorized - missing or invalid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - caller does not have permission to execute this action
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Action not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               notFound:
 *                 value:
 *                   message: "Action not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
actionRoute.patch('/:id', authorizeUser, validateParams(actionIdParamsSchema), executeAction);

export default actionRoute;
