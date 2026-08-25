import express from 'express';
import {
  deleteClassification,
  getClassifications,
  upsertClassification,
} from '../controllers/classificationController';
import {
  rejectIfArchived,
  requireTeamMember,
  requireTeamOwner,
} from '../middleware/teamAuthzMiddleware';
import {
  deleteClassificationQuerySchema,
  getClassificationsQuerySchema,
  upsertClassificationBodySchema,
  validateBody,
  validateQuery,
} from '../validation';

const classificationRoutes = express.Router();

/**
 * @openapi
 * /accounting/classification:
 *  get:
 *   summary: List a team's manual Bank/Safe transaction classifications
 *   tags: [AccountingClassification]
 *   security:
 *     - bearerAuth: []
 *   parameters:
 *     - in: query
 *       name: teamId
 *       required: true
 *       schema:
 *         type: integer
 *         description: The ID of the team
 *   responses:
 *     200:
 *       description: Classifications retrieved successfully
 *     400:
 *       description: Bad request
 *     403:
 *       description: Caller is not a member of the team
 *     500:
 *       description: Internal server error
 */
classificationRoutes.get(
  '/',
  validateQuery(getClassificationsQuerySchema),
  requireTeamMember('query.teamId'),
  getClassifications
);

/**
 * @openapi
 * /accounting/classification:
 *  put:
 *   summary: Create or update the classification of a Bank/Safe transaction
 *   tags: [AccountingClassification]
 *   security:
 *     - bearerAuth: []
 *   requestBody:
 *     required: true
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             teamId:
 *               type: integer
 *               description: The ID of the team
 *             txId:
 *               type: string
 *               description: Stable transaction identity `${txHash}-${logIndex}`
 *             category:
 *               type: string
 *               enum: [REVENUE, EXPENSE, SHAREHOLDER_LOAN, OWNER_CAPITAL, INTERNAL_TRANSFER]
 *               description: The accounting category to book the transaction as
 *             memo:
 *               type: string
 *               description: Optional free-text note explaining the booking
 *   responses:
 *     200:
 *       description: Classification created or updated successfully
 *     400:
 *       description: Bad request
 *     403:
 *       description: Caller is not the owner of the team
 *     409:
 *       description: Team is archived and cannot be modified
 *     500:
 *       description: Internal server error
 */
classificationRoutes.put(
  '/',
  validateBody(upsertClassificationBodySchema),
  requireTeamOwner('body.teamId'),
  rejectIfArchived('body.teamId'),
  upsertClassification
);

/**
 * @openapi
 * /accounting/classification:
 *  delete:
 *   summary: Remove a classification so the transaction falls back to inference
 *   tags: [AccountingClassification]
 *   security:
 *     - bearerAuth: []
 *   parameters:
 *     - in: query
 *       name: teamId
 *       required: true
 *       schema:
 *         type: integer
 *         description: The ID of the team
 *     - in: query
 *       name: txId
 *       required: true
 *       schema:
 *         type: string
 *         description: Stable transaction identity `${txHash}-${logIndex}`
 *   responses:
 *     200:
 *       description: Classification removed successfully
 *     400:
 *       description: Bad request
 *     403:
 *       description: Caller is not the owner of the team
 *     404:
 *       description: Classification not found
 *     409:
 *       description: Team is archived and cannot be modified
 *     500:
 *       description: Internal server error
 */
classificationRoutes.delete(
  '/',
  validateQuery(deleteClassificationQuerySchema),
  requireTeamOwner('query.teamId'),
  rejectIfArchived('query.teamId'),
  deleteClassification
);

export default classificationRoutes;
