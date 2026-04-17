import express from 'express';
import {
  addTeam,
  updateTeam,
  deleteTeam,
  getTeam,
  getAllTeams,
} from '../controllers/teamController';

import { deleteMember, addMembers } from '../controllers/memberController';
import { checkSubmitRestriction } from '../controllers/featureController';
import {
  validateBody,
  validateQuery,
  validateParams,
  validateBodyAndParams,
  addTeamBodySchema,
  updateTeamBodySchema,
  getAllTeamsQuerySchema,
  addMembersBodySchema,
  deleteMemberParamsSchema,
  teamIdParamsSchema,
} from '../validation';

const teamRoutes = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Team:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The ID of the team
 *         name:
 *           type: string
 *           description: The name of the team
 *         description:
 *           type: string
 *           description: The description of the team
 *           nullable: true
 *         ownerAddress:
 *           type: string
 *           description: The Ethereum address of the team owner
 *         currentOfficer:
 *           type: object
 *           nullable: true
 *           description: The team's currently active Officer contract (head of the linked list). Null if no Officer has ever been deployed.
 *           properties:
 *             id:
 *               type: integer
 *             address:
 *               type: string
 *             deployer:
 *               type: string
 *             deployBlockNumber:
 *               type: string
 *               nullable: true
 *             deployedAt:
 *               type: string
 *               format: date-time
 *               nullable: true
 *             previousOfficerId:
 *               type: integer
 *               nullable: true
 *             previousOfficer:
 *               type: object
 *               nullable: true
 *               description: The prior Officer generation this one points back to. Null for the first Officer ever deployed on the team.
 *               properties:
 *                 id:
 *                   type: integer
 *                 address:
 *                   type: string
 *         members:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               address:
 *                 type: string
 *               name:
 *                 type: string
 *                 nullable: true
 *     TeamMember:
 *       type: object
 *       properties:
 *         address:
 *           type: string
 *           description: The Ethereum address of the member
 *         name:
 *           type: string
 *           description: The name of the member
 *           nullable: true
 */

/**
 * @openapi
 * /teams:
 *  post:
 *   summary: Create a new team
 *   description: Creates a new team with the specified members. The caller is automatically added as a member.
 *   requestBody:
 *     required: true
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           required:
 *             - name
 *             - members
 *           properties:
 *             name:
 *               type: string
 *               description: The name of the team
 *             description:
 *               type: string
 *               description: The description of the team
 *             members:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   address:
 *                     type: string
 *                     pattern: "^0x[a-fA-F0-9]{40}$"
 *                   name:
 *                     type: string
 *   responses:
 *     201:
 *       description: Team created successfully
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Team'
 *     400:
 *       description: Bad request - invalid member addresses or missing required fields
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     404:
 *       description: Owner not found - caller is not a registered user
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
teamRoutes.post('/', validateBody(addTeamBodySchema), addTeam);

/**
 * @openapi
 * /teams:
 *  get:
 *   summary: Get all teams or teams for a specific user
 *   description: Retrieves all teams, or teams filtered by userAddress if provided. Caller can only request their own teams.
 *   parameters:
 *     - in: query
 *       name: userAddress
 *       schema:
 *         type: string
 *         pattern: "^0x[a-fA-F0-9]{40}$"
 *       description: Filter teams by user address (must be caller's own address)
 *   responses:
 *     200:
 *       description: Teams retrieved successfully
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/Team'
 *     400:
 *       description: Bad request - invalid query parameters
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     403:
 *       description: Forbidden - cannot request teams for another user
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
teamRoutes.get('/', validateQuery(getAllTeamsQuerySchema), getAllTeams);

// Team Feature Routes (must be before /:id routes to avoid conflicts)
/**
 * @openapi
 * /teams/{id}/submit-restriction:
 *   get:
 *     summary: Check if submit restriction is active for a team
 *     description: Returns the submit restriction status for a specific team, including the effective feature status.
 *     tags: [Teams, Features]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Team ID
 *     responses:
 *       200:
 *         description: Submit restriction status for the team
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     teamId:
 *                       type: integer
 *                     isRestricted:
 *                       type: boolean
 *                     effectiveStatus:
 *                       type: string
 *                       enum: [enabled, disabled, beta]
 *       400:
 *         description: Bad request - invalid team ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Team not found
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
teamRoutes.get(
  '/:id/submit-restriction',
  validateParams(teamIdParamsSchema),
  checkSubmitRestriction
);

/**
 * @openapi
 * /teams/{id}/member:
 *  post:
 *   summary: Add members to a team
 *   description: Adds one or more members to a team. Only the team owner can add members.
 *   parameters:
 *     - in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: integer
 *       description: The ID of the team
 *   requestBody:
 *     required: true
 *     content:
 *       application/json:
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               address:
 *                 type: string
 *                 pattern: "^0x[a-fA-F0-9]{40}$"
 *   responses:
 *     201:
 *       description: Members added successfully
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               members:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/TeamMember'
 *     400:
 *       description: Bad request - invalid member data or members already in team
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     403:
 *       description: Forbidden - only the team owner can add members
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
teamRoutes.post(
  '/:id/member',
  validateBodyAndParams(addMembersBodySchema, teamIdParamsSchema),
  addMembers
);

/**
 * @openapi
 * /teams/{id}/member/{memberAddress}:
 *  delete:
 *   summary: Remove a member from a team
 *   description: Removes a specific member from a team. Only the team owner can remove members. The owner cannot be removed.
 *   parameters:
 *     - in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: integer
 *       description: The ID of the team
 *     - in: path
 *       name: memberAddress
 *       required: true
 *       schema:
 *         type: string
 *         pattern: "^0x[a-fA-F0-9]{40}$"
 *       description: The Ethereum address of the member to remove
 *   responses:
 *     204:
 *       description: Member removed successfully
 *     400:
 *       description: Bad request - invalid parameters
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     403:
 *       description: Forbidden - only the owner can remove members, or the owner cannot be removed
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     404:
 *       description: Team or member not found
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
teamRoutes.delete(
  '/:id/member/:memberAddress',
  validateParams(deleteMemberParamsSchema),
  deleteMember
);

/**
 * @openapi
 * /teams/{id}:
 *  get:
 *   summary: Get a specific team by ID
 *   description: Retrieves team details including members and contracts. Caller must be a team member.
 *   parameters:
 *     - in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: integer
 *       description: The ID of the team
 *   responses:
 *     200:
 *       description: Team retrieved successfully
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Team'
 *     400:
 *       description: Bad request - invalid team ID
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
teamRoutes.get('/:id', validateParams(teamIdParamsSchema), getTeam);

/**
 * @openapi
 * /teams/{id}:
 *  put:
 *   summary: Update a team
 *   description: Updates team metadata (name, description). Only the team owner can update. The current Officer is managed via POST /contract/officer.
 *   parameters:
 *     - in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: integer
 *       description: The ID of the team
 *   requestBody:
 *     required: true
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               description: The new name of the team
 *             description:
 *               type: string
 *               description: The new description of the team
 *   responses:
 *     200:
 *       description: Team updated successfully
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Team'
 *     400:
 *       description: Bad request - invalid parameters
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     403:
 *       description: Forbidden - only the team owner can update
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
teamRoutes.put('/:id', validateBodyAndParams(updateTeamBodySchema, teamIdParamsSchema), updateTeam);

/**
 * @openapi
 * /teams/{id}:
 *  delete:
 *   summary: Delete a team
 *   description: Deletes a team and all related records (cascading). Only the team owner can delete.
 *   parameters:
 *     - in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: integer
 *       description: The ID of the team to delete
 *   responses:
 *     204:
 *       description: Team deleted successfully
 *     400:
 *       description: Bad request - invalid team ID
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     403:
 *       description: Forbidden - only the team owner can delete
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
teamRoutes.delete('/:id', validateParams(teamIdParamsSchema), deleteTeam);

export default teamRoutes;
