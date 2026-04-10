import express from 'express';
import {
  getNotification,
  updateNotification,
  createBulkNotifications,
} from '../controllers/notificationController';
import { authorizeUser } from '../middleware/authMiddleware';
import {
  validateQuery,
  validateParams,
  validateBody,
  getNotificationsQuerySchema,
  updateNotificationParamsSchema,
  updateNotificationBodySchema,
  createBulkNotificationsBodySchema,
} from '../validation';

const notificationRoute = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Notification:
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
 *           description: The type of notification
 *           enum: [info, warning, error, success]
 *           example: "info"
 *         title:
 *           type: string
 *           description: The notification title
 *           example: "New message received"
 *         message:
 *           type: string
 *           description: The notification message content
 *           example: "You have a new message from John Doe"
 *         isRead:
 *           type: boolean
 *           description: Whether the notification has been read
 *           example: false
 *         metadata:
 *           type: object
 *           description: Additional metadata for the notification
 *           nullable: true
 *           example: { "teamId": 5, "claimId": 123 }
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
 *     NotificationListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Notification'
 *         total:
 *           type: integer
 *           description: Total number of notifications
 *           example: 25
 *         unreadCount:
 *           type: integer
 *           description: Number of unread notifications
 *           example: 5
 *     BulkNotificationRequest:
 *       type: object
 *       required:
 *         - userIds
 *         - type
 *         - title
 *         - message
 *       properties:
 *         userIds:
 *           type: array
 *           items:
 *             type: integer
 *           description: Array of user IDs to receive the notification
 *           example: [1, 2, 3, 4, 5]
 *         type:
 *           type: string
 *           enum: [info, warning, error, success]
 *           description: The type of notification
 *           example: "info"
 *         title:
 *           type: string
 *           description: The notification title
 *           example: "Team update"
 *         message:
 *           type: string
 *           description: The notification message
 *           example: "Your team has been updated with new information"
 *         metadata:
 *           type: object
 *           description: Additional metadata for the notification
 *           example: { "teamId": 5, "updateType": "members" }
 *     BulkNotificationResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Whether the bulk creation was successful
 *           example: true
 *         count:
 *           type: integer
 *           description: Number of notifications created
 *           example: 5
 *         notifications:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Notification'
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Error message
 */

/**
 * @openapi
 * /notifications:
 *   get:
 *     summary: Get notifications for the authenticated user
 *     description: |
 *       Retrieves all notifications for the authenticated user. Can optionally filter by read status,
 *       notification type, and pagination parameters.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isRead
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Filter by read status (true = read only, false = unread only)
 *         example: false
 *       - in: query
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *           enum: [info, warning, error, success]
 *         description: Filter by notification type
 *         example: "info"
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Maximum number of notifications to return
 *         example: 20
 *       - in: query
 *         name: offset
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of notifications to skip
 *         example: 0
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationListResponse'
 *             examples:
 *               withNotifications:
 *                 value:
 *                   data:
 *                     - id: 1
 *                       userId: 42
 *                       type: "info"
 *                       title: "New message"
 *                       message: "You have a new message"
 *                       isRead: false
 *                       metadata: { "teamId": 5 }
 *                       createdAt: "2024-01-15T10:30:00.000Z"
 *                       updatedAt: "2024-01-15T10:30:00.000Z"
 *                   total: 25
 *                   unreadCount: 5
 *       400:
 *         description: Bad request - invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalidType:
 *                 value:
 *                   message: "Invalid notification type. Must be one of: info, warning, error, success"
 *               invalidLimit:
 *                 value:
 *                   message: "Limit must be between 1 and 100"
 *       401:
 *         description: Unauthorized - missing or invalid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - user is not allowed to view the requested notifications
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Not found - notifications resource was not found
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
notificationRoute.get(
  '/',
  authorizeUser,
  validateQuery(getNotificationsQuerySchema),
  getNotification
);

/**
 * @openapi
 * /notifications/{id}:
 *   put:
 *     summary: Update a notification
 *     description: |
 *       Updates a notification's properties, typically used to mark a notification as read.
 *       Only the owner of the notification can update it.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: The ID of the notification to update
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isRead:
 *                 type: boolean
 *                 description: Mark notification as read or unread
 *                 example: true
 *           examples:
 *             markAsRead:
 *               value:
 *                 isRead: true
 *             markAsUnread:
 *               value:
 *                 isRead: false
 *     responses:
 *       200:
 *         description: Notification updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 notification:
 *                   $ref: '#/components/schemas/Notification'
 *             examples:
 *               success:
 *                 value:
 *                   success: true
 *                   notification:
 *                     id: 1
 *                     userId: 42
 *                     type: "info"
 *                     title: "New message"
 *                     message: "You have a new message"
 *                     isRead: true
 *                     metadata: { "teamId": 5 }
 *                     createdAt: "2024-01-15T10:30:00.000Z"
 *                     updatedAt: "2024-01-15T11:00:00.000Z"
 *       400:
 *         description: Bad request - invalid notification ID or body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalidId:
 *                 value:
 *                   message: "Invalid notification ID"
 *               missingIsRead:
 *                 value:
 *                   message: "isRead field is required"
 *       401:
 *         description: Unauthorized - missing or invalid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - user does not own this notification
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               notOwner:
 *                 value:
 *                   message: "You are not authorized to update this notification"
 *       404:
 *         description: Notification not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               notFound:
 *                 value:
 *                   message: "Notification not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
notificationRoute.put(
  '/:id',
  authorizeUser,
  validateParams(updateNotificationParamsSchema),
  validateBody(updateNotificationBodySchema),
  updateNotification
);

/**
 * @openapi
 * /notifications/bulk:
 *   post:
 *     summary: Create notifications for multiple users
 *     description: |
 *       Creates the same notification for multiple users at once. Useful for team-wide announcements
 *       or batch notifications. Requires appropriate permissions.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkNotificationRequest'
 *           examples:
 *             teamUpdate:
 *               summary: Team update notification
 *               value:
 *                 userIds: [1, 2, 3, 4, 5]
 *                 type: "info"
 *                 title: "Team update"
 *                 message: "Your team has been updated with new information"
 *                 metadata:
 *                   teamId: 5
 *                   updateType: "members"
 *             systemAlert:
 *               summary: System alert notification
 *               value:
 *                 userIds: [1, 2, 3]
 *                 type: "warning"
 *                 title: "System maintenance"
 *                 message: "The system will be under maintenance on Sunday"
 *                 metadata:
 *                   maintenanceDate: "2024-01-20"
 *     responses:
 *       201:
 *         description: Bulk notifications created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BulkNotificationResponse'
 *             examples:
 *               success:
 *                 value:
 *                   success: true
 *                   count: 5
 *                   notifications:
 *                     - id: 1
 *                       userId: 1
 *                       type: "info"
 *                       title: "Team update"
 *                       message: "Your team has been updated"
 *                       isRead: false
 *                       metadata: { "teamId": 5 }
 *                       createdAt: "2024-01-15T10:30:00.000Z"
 *                       updatedAt: "2024-01-15T10:30:00.000Z"
 *       400:
 *         description: Bad request - invalid or missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               emptyUserIds:
 *                 value:
 *                   message: "userIds array cannot be empty"
 *               invalidType:
 *                 value:
 *                   message: "type must be one of: info, warning, error, success"
 *               missingTitle:
 *                 value:
 *                   message: "title is required"
 *               missingMessage:
 *                 value:
 *                   message: "message is required"
 *       401:
 *         description: Unauthorized - missing or invalid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - insufficient permissions to create bulk notifications
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               insufficientPermissions:
 *                 value:
 *                   message: "You do not have permission to create bulk notifications"
 *       404:
 *         description: Not found - one or more target notification resources were not found
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
notificationRoute.post(
  '/bulk',
  authorizeUser,
  validateBody(createBulkNotificationsBodySchema),
  createBulkNotifications
);

export default notificationRoute;
