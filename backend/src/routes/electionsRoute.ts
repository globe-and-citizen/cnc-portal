import express from 'express';
import { addElectionNotifications } from '../controllers/electionsController';
import { authorizeUser } from '../middleware/authMiddleware';
import { rejectIfArchived } from '../middleware/teamAuthzMiddleware';
import {
  validateParams,
  validateBody,
  addElectionNotificationsParamsSchema,
  addElectionNotificationsBodySchema,
} from '../validation';

const electionRoute = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Error message
 */

/**
 * @openapi
 * /elections/{teamId}:
 *   post:
 *     summary: Notify a team that a board election has been created
 *     description: |
 *       Sends a "New Election Created" notification to every member of the team.
 *       The portal calls this right after the on-chain election has been created.
 *       Only the team owner can call it: the Elections contract belongs to the
 *       person who set the team up, and only its owner can create an election.
 *     tags: [Elections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: The ID of the team whose members are notified
 *         example: 5
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Notifications created for every team member
 *       400:
 *         description: Invalid team ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: The caller is not the team owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               notOwner:
 *                 value:
 *                   message: "Only the team owner can send election notifications"
 *       404:
 *         description: Team not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               teamNotFound:
 *                 value:
 *                   message: "Team not found"
 *       409:
 *         description: The team is archived
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
electionRoute.post(
  '/:teamId',
  authorizeUser,
  validateParams(addElectionNotificationsParamsSchema),
  validateBody(addElectionNotificationsBodySchema),
  rejectIfArchived('params.teamId'),
  addElectionNotifications
);

export default electionRoute;
