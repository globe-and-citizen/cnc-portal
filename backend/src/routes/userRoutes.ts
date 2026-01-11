import express from 'express';
import { getNonce, getUser, updateUser, getAllUsers } from '../controllers/userController';
import { authorizeUser } from '../middleware/authMiddleware';
import {
  validateParams,
  validateQuery,
  validateBodyAndParams,
  addressParamsSchema,
  updateUserBodySchema,
  userPaginationQuerySchema,
} from '../validation';
import { upload } from '../utils/upload';

const userRoutes = express.Router();

/**
 * @openapi
 * /api/user/nonce/{address}:
 *   get:
 *     summary: Get nonce for SIWE authentication
 *     description: Retrieves a nonce for Sign-In with Ethereum (SIWE) authentication. If the user doesn't exist, a new nonce is generated. If the user exists, their stored nonce is returned.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^0x[a-fA-F0-9]{40}$'
 *         description: The user's Ethereum address
 *         example: "0x1234567890123456789012345678901234567890"
 *     responses:
 *       200:
 *         description: Successfully retrieved nonce
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 nonce:
 *                   type: string
 *                   description: Nonce for SIWE message signing
 *                   example: "32891756"
 *       400:
 *         description: Bad request - invalid address format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 */
userRoutes.get('/nonce/:address', validateParams(addressParamsSchema), getNonce);

/**
 * @openapi
 * /api/user:
 *   get:
 *     summary: Get all users with pagination
 *     description: Retrieves a paginated list of all users. Supports search by user name or address. Requires authentication.
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Number of results per page
 *         example: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search users by name or address (case-insensitive)
 *         example: "john"
 *     responses:
 *       200:
 *         description: Successfully retrieved users list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       address:
 *                         type: string
 *                         description: User's Ethereum address
 *                         example: "0x1234567890123456789012345678901234567890"
 *                       name:
 *                         type: string
 *                         nullable: true
 *                         example: "John Doe"
 *                       imageUrl:
 *                         type: string
 *                         nullable: true
 *                         example: "https://example.com/image.jpg"
 *                       roles:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: User's roles
 *                         example: ["ROLE_USER"]
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                 totalUsers:
 *                   type: integer
 *                   description: Total number of users
 *                   example: 42
 *                 currentPage:
 *                   type: integer
 *                   description: Current page number
 *                   example: 1
 *                 totalPages:
 *                   type: integer
 *                   description: Total number of pages
 *                   example: 5
 *       401:
 *         description: Unauthorized - missing or invalid authentication token
 *       400:
 *         description: Bad request - invalid query parameters
 *       500:
 *         description: Internal server error
 */
userRoutes.get('/', authorizeUser, validateQuery(userPaginationQuerySchema), getAllUsers);

/**
 * @openapi
 * /api/user/{address}:
 *   get:
 *     summary: Get a specific user by address
 *     description: Retrieves detailed information about a specific user. Requires authentication.
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^0x[a-fA-F0-9]{40}$'
 *         description: The user's Ethereum address
 *         example: "0x1234567890123456789012345678901234567890"
 *     responses:
 *       200:
 *         description: Successfully retrieved user information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 address:
 *                   type: string
 *                   example: "0x1234567890123456789012345678901234567890"
 *                 name:
 *                   type: string
 *                   nullable: true
 *                   example: "John Doe"
 *                 imageUrl:
 *                   type: string
 *                   nullable: true
 *                   example: "https://example.com/image.jpg"
 *                 roles:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: User's roles
 *                   example: ["ROLE_USER"]
 *                 nonce:
 *                   type: string
 *                   description: Current nonce for SIWE authentication
 *                   example: "32891756"
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized - missing or invalid authentication token
 *       400:
 *         description: Bad request - invalid address format
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 *   put:
 *     summary: Update user profile
 *     description: Updates the user's profile information (name and image URL). Users can only update their own profile. Requires authentication.
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^0x[a-fA-F0-9]{40}$'
 *         description: The user's Ethereum address
 *         example: "0x1234567890123456789012345678901234567890"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: User's display name
 *                 minLength: 1
 *                 maxLength: 255
 *                 example: "John Doe"
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *                 description: URL to user's profile image
 *                 maxLength: 2083
 *                 example: "https://example.com/avatar.jpg"
 *     responses:
 *       200:
 *         description: Successfully updated user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 address:
 *                   type: string
 *                   example: "0x1234567890123456789012345678901234567890"
 *                 name:
 *                   type: string
 *                   example: "John Doe"
 *                 imageUrl:
 *                   type: string
 *                   example: "https://example.com/avatar.jpg"
 *       401:
 *         description: Unauthorized - missing or invalid authentication token
 *       403:
 *         description: Forbidden - user can only update their own profile
 *       400:
 *         description: Bad request - invalid parameters
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
userRoutes.get('/:address', authorizeUser, validateParams(addressParamsSchema), getUser);
// Updated to accept multipart/form-data with optional profile image upload
userRoutes.put(
  '/:address',
  authorizeUser,
  upload.single('profileImage'),
  validateBodyAndParams(updateUserBodySchema, addressParamsSchema),
  updateUser
);

export default userRoutes;
