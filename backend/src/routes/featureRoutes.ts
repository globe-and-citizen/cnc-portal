import { Router } from 'express';
import {
  listFeatures,
  getFeatureByName,
  createNewFeature,
  updateFeatureByName,
  deleteFeatureByName,
  createOverride,
  updateOverride,
  removeOverride,
} from '../controllers/featureController';

const router = Router();

// ============================================
// Feature CRUD Endpoints
// ============================================

/**
 * @swagger
 * /api/admin/features:
 *   get:
 *     summary: List all features
 *     tags: [Features]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all features
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       functionName:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [enabled, disabled, beta]
 *                       overridesCount:
 *                         type: integer
 */
router.get('/', listFeatures);

/**
 * @swagger
 * /api/admin/features/{functionName}:
 *   get:
 *     summary: Get a specific feature
 *     tags: [Features]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: functionName
 *         required: true
 *         schema:
 *           type: string
 *         description: Feature name (e.g., SUBMIT_RESTRICTION)
 *     responses:
 *       200:
 *         description: Feature details with overrides
 *       404:
 *         description: Feature not found
 */
router.get('/:functionName', getFeatureByName);

/**
 * @swagger
 * /api/admin/features:
 *   post:
 *     summary: Create a new feature
 *     tags: [Features]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - functionName
 *               - status
 *             properties:
 *               functionName:
 *                 type: string
 *                 description: Feature name in UPPERCASE_SNAKE_CASE
 *                 example: NEW_FEATURE
 *               status:
 *                 type: string
 *                 enum: [enabled, disabled, beta]
 *     responses:
 *       201:
 *         description: Feature created
 *       409:
 *         description: Feature already exists
 */
router.post('/', createNewFeature);

/**
 * @swagger
 * /api/admin/features/{functionName}:
 *   put:
 *     summary: Update a feature's status
 *     tags: [Features]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: functionName
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [enabled, disabled, beta]
 *     responses:
 *       200:
 *         description: Feature updated
 *       404:
 *         description: Feature not found
 */
router.put('/:functionName', updateFeatureByName);

/**
 * @swagger
 * /api/admin/features/{functionName}:
 *   delete:
 *     summary: Delete a feature and all its overrides
 *     tags: [Features]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: functionName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Feature deleted
 *       404:
 *         description: Feature not found
 */
router.delete('/:functionName', deleteFeatureByName);

// ============================================
// Team Override Endpoints
// ============================================

/**
 * @swagger
 * /api/admin/features/{functionName}/teams:
 *   post:
 *     summary: Create a team override for a feature
 *     tags: [Features]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: functionName
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - teamId
 *               - status
 *             properties:
 *               teamId:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [enabled, disabled, beta]
 *     responses:
 *       201:
 *         description: Override created
 *       404:
 *         description: Feature or team not found
 *       409:
 *         description: Override already exists
 */
router.post('/:functionName/teams', createOverride);

/**
 * @swagger
 * /api/admin/features/{functionName}/teams/{teamId}:
 *   put:
 *     summary: Update a team override
 *     tags: [Features]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: functionName
 *         required: true
 *         schema:
 *           type: string
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [enabled, disabled, beta]
 *     responses:
 *       200:
 *         description: Override updated
 *       404:
 *         description: Feature, team, or override not found
 */
router.put('/:functionName/teams/:teamId', updateOverride);

/**
 * @swagger
 * /api/admin/features/{functionName}/teams/{teamId}:
 *   delete:
 *     summary: Delete a team override
 *     tags: [Features]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: functionName
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Override deleted - team inherits global setting
 *       404:
 *         description: Feature or override not found
 */
router.delete('/:functionName/teams/:teamId', removeOverride);

export default router;
