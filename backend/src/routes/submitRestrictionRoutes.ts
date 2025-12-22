import { Router } from 'express';
import {
  getStatus,
  getGlobalSetting,
  updateGlobalSetting,
  getOverrides,
  createOrUpdateOverride,
  removeOverride,
  getAvailableTeams,
  checkRestriction,
} from '../controllers/submitRestrictionController';

const router = Router();

/**
 * @swagger
 * /api/admin/submit-restriction:
 *   get:
 *     summary: Get complete submit restriction status
 *     tags: [Submit Restriction]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Submit restriction status
 */
router.get('/', getStatus);

/**
 * @swagger
 * /api/admin/submit-restriction/global:
 *   get:
 *     summary: Get global submit restriction setting
 *     tags: [Submit Restriction]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Global setting details
 */
router.get('/global', getGlobalSetting);

/**
 * @swagger
 * /api/admin/submit-restriction/global:
 *   put:
 *     summary: Update global submit restriction setting
 *     tags: [Submit Restriction]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isRestricted
 *             properties:
 *               isRestricted:
 *                 type: boolean
 *                 description: Whether submit should be restricted to current week
 *     responses:
 *       200:
 *         description: Global setting updated
 */
router.put('/global', updateGlobalSetting);

/**
 * @swagger
 * /api/admin/submit-restriction/overrides:
 *   get:
 *     summary: Get all team overrides with pagination
 *     tags: [Submit Restriction]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of team overrides
 */
router.get('/overrides', getOverrides);

/**
 * @swagger
 * /api/admin/submit-restriction/overrides/{teamId}:
 *   post:
 *     summary: Create or update a team override
 *     tags: [Submit Restriction]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isRestricted
 *             properties:
 *               isRestricted:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Override created/updated
 *       404:
 *         description: Team not found
 */
router.post('/overrides/:teamId', createOrUpdateOverride);

/**
 * @swagger
 * /api/admin/submit-restriction/overrides/{teamId}:
 *   put:
 *     summary: Update a team override
 *     tags: [Submit Restriction]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isRestricted
 *             properties:
 *               isRestricted:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Override updated
 *       404:
 *         description: Team not found
 */
router.put('/overrides/:teamId', createOrUpdateOverride);

/**
 * @swagger
 * /api/admin/submit-restriction/overrides/{teamId}:
 *   delete:
 *     summary: Delete a team override
 *     description: Removes the override so team inherits global setting
 *     tags: [Submit Restriction]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Override removed
 *       404:
 *         description: Override not found
 */
router.delete('/overrides/:teamId', removeOverride);

/**
 * @swagger
 * /api/admin/submit-restriction/teams/available:
 *   get:
 *     summary: Get teams available for override
 *     description: Returns teams that don't have an existing override
 *     tags: [Submit Restriction]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for team name
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: List of available teams
 */
router.get('/teams/available', getAvailableTeams);

/**
 * @swagger
 * /api/admin/submit-restriction/check:
 *   get:
 *     summary: Check if submit is restricted for a team
 *     description: Public endpoint to check restriction status for a specific team
 *     tags: [Submit Restriction]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: teamId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Restriction status for the team
 *       404:
 *         description: Team not found
 */
router.get('/check', checkRestriction);

export default router;
