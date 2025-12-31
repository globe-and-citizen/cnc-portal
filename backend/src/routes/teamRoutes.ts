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

const teamRoutes = express.Router();

// Team CRUD routes
teamRoutes.post('/', addTeam);
teamRoutes.get('/', getAllTeams);

// Team Feature Routes (must be before /:id routes to avoid conflicts)
/**
 * @swagger
 * /api/teams/{id}/submit-restriction:
 *   get:
 *     summary: Check if submit restriction is active for a team
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
 *       404:
 *         description: Team not found
 */
teamRoutes.get('/:id/submit-restriction', checkSubmitRestriction);

// Team Members CRUD routes (must be before generic /:id route)
teamRoutes.post('/:id/member', addMembers);
teamRoutes.delete('/:id/member/:memberAddress', deleteMember);

// Generic team routes (last, as they catch all patterns)
teamRoutes.get('/:id', getTeam);
teamRoutes.put('/:id', updateTeam);
teamRoutes.delete('/:id', deleteTeam);

export default teamRoutes;
