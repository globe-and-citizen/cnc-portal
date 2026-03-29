import express from 'express';
import { addElectionNotifications } from '../controllers/electionsController';
import { authorizeUser } from '../middleware/authMiddleware';
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
 *     ElectionNotification:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The unique ID of the notification
 *           example: 1
 *         userId:
 *           type: integer
 *           description: The ID of the user who receives the notification
 *           example: 42
 *         type:
 *           type: string
 *           enum: [info, warning, error, success]
 *           description: The type of notification
 *           example: "info"
 *         title:
 *           type: string
 *           description: The notification title
 *           example: "New election started"
 *         message:
 *           type: string
 *           description: The notification message content
 *           example: "A new board election has been initiated for your team"
 *         isRead:
 *           type: boolean
 *           description: Whether the notification has been read
 *           example: false
 *         metadata:
 *           type: object
 *           description: Additional metadata for the election notification
 *           properties:
 *             teamId:
 *               type: integer
 *               example: 5
 *             electionId:
 *               type: integer
 *               example: 123
 *             electionType:
 *               type: string
 *               example: "board_election"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the notification was created
 *           example: "2024-01-15T10:30:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the notification was last updated
 *           example: "2024-01-15T10:30:00.000Z"
 *     ElectionNotificationRequest:
 *       type: object
 *       required:
 *         - userIds
 *         - title
 *         - message
 *       properties:
 *         userIds:
 *           type: array
 *           items:
 *             type: integer
 *           description: Array of user IDs to receive the election notification
 *           minItems: 1
 *           example: [1, 2, 3, 4, 5]
 *         title:
 *           type: string
 *           description: The notification title
 *           minLength: 1
 *           maxLength: 255
 *           example: "New board election started"
 *         message:
 *           type: string
 *           description: The notification message
 *           minLength: 1
 *           maxLength: 1000
 *           example: "A new election has been initiated for the board of directors"
 *         type:
 *           type: string
 *           enum: [info, warning, error, success]
 *           description: The type of notification (defaults to 'info')
 *           default: info
 *           example: "info"
 *         electionId:
 *           type: integer
 *           description: The ID of the election (optional)
 *           example: 123
 *         electionType:
 *           type: string
 *           description: The type of election
 *           enum: [board_election, member_election, proposal_vote]
 *           example: "board_election"
 *     ElectionNotificationResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Whether the operation was successful
 *           example: true
 *         count:
 *           type: integer
 *           description: Number of notifications created
 *           example: 5
 *         notifications:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ElectionNotification'
 *         message:
 *           type: string
 *           description: Success message
 *           example: "Election notifications sent successfully"
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
 *     summary: Send election notifications to team members
 *     description: |
 *       Creates and sends election-related notifications to specified team members.
 *       This endpoint is typically used when a new election is initiated or when there
 *       are important updates about an ongoing election. Only authorized users can send
 *       election notifications.
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
 *         description: The ID of the team for which to send election notifications
 *         example: 5
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ElectionNotificationRequest'
 *           examples:
 *             boardElection:
 *               summary: Board of Directors election notification
 *               value:
 *                 userIds: [1, 2, 3, 4, 5]
 *                 title: "New Board Election"
 *                 message: "A new election for the Board of Directors has been initiated. Please cast your vote."
 *                 type: "info"
 *                 electionId: 123
 *                 electionType: "board_election"
 *             electionReminder:
 *               summary: Election voting reminder
 *               value:
 *                 userIds: [1, 2, 3]
 *                 title: "Election Voting Reminder"
 *                 message: "The election voting period ends in 24 hours. Make sure to cast your vote."
 *                 type: "warning"
 *                 electionId: 123
 *                 electionType: "board_election"
 *             electionResults:
 *               summary: Election results announcement
 *               value:
 *                 userIds: [1, 2, 3, 4, 5, 6, 7]
 *                 title: "Election Results"
 *                 message: "The board election has concluded. View the results to see who was elected."
 *                 type: "success"
 *                 electionId: 123
 *                 electionType: "board_election"
 *     responses:
 *       201:
 *         description: Election notifications created and sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ElectionNotificationResponse'
 *             examples:
 *               success:
 *                 value:
 *                   success: true
 *                   count: 5
 *                   notifications:
 *                     - id: 1
 *                       userId: 1
 *                       type: "info"
 *                       title: "New Board Election"
 *                       message: "A new election has been initiated"
 *                       isRead: false
 *                       metadata:
 *                         teamId: 5
 *                         electionId: 123
 *                         electionType: "board_election"
 *                       createdAt: "2024-01-15T10:30:00.000Z"
 *                       updatedAt: "2024-01-15T10:30:00.000Z"
 *                   message: "Election notifications sent successfully"
 *       400:
 *         description: Bad request - invalid or missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalidTeamId:
 *                 value:
 *                   message: "Invalid team ID. Must be a positive integer"
 *               emptyUserIds:
 *                 value:
 *                   message: "userIds array cannot be empty"
 *               missingTitle:
 *                 value:
 *                   message: "title is required"
 *               missingMessage:
 *                 value:
 *                   message: "message is required"
 *               titleTooLong:
 *                 value:
 *                   message: "title must be 255 characters or less"
 *               invalidType:
 *                 value:
 *                   message: "type must be one of: info, warning, error, success"
 *               invalidElectionType:
 *                 value:
 *                   message: "electionType must be one of: board_election, member_election, proposal_vote"
 *       401:
 *         description: Unauthorized - missing or invalid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               unauthorized:
 *                 value:
 *                   message: "Authentication token is required"
 *       403:
 *         description: Forbidden - user does not have permission to send election notifications
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               notTeamMember:
 *                 value:
 *                   message: "You are not a member of this team"
 *               insufficientPermissions:
 *                 value:
 *                   message: "You do not have permission to send election notifications"
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
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               serverError:
 *                 value:
 *                   message: "Failed to send election notifications"
 */
electionRoute.post(
  '/:teamId',
  authorizeUser,
  validateParams(addElectionNotificationsParamsSchema),
  validateBody(addElectionNotificationsBodySchema),
  addElectionNotifications
);

export default electionRoute;
