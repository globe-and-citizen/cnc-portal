import express from 'express';
import {
  deleteJournalAccountAssignment,
  getJournalAccountAssignments,
  upsertJournalAccountAssignment,
} from '../controllers/journalAccountAssignmentController';
import {
  rejectIfArchived,
  requireTeamMember,
  requireTeamOwner,
} from '../middleware/teamAuthzMiddleware';
import {
  deleteJournalAccountAssignmentQuerySchema,
  getJournalAccountAssignmentsQuerySchema,
  upsertJournalAccountAssignmentBodySchema,
  validateBody,
  validateQuery,
} from '../validation';

const journalAccountAssignmentRoutes = express.Router();

/**
 * @openapi
 * /accounting/account-assignment:
 *  get:
 *   summary: List a team's JournalEntry account assignments
 *   tags: [Accounting]
 *   security:
 *     - bearerAuth: []
 *   parameters:
 *     - in: query
 *       name: teamId
 *       required: true
 *       schema:
 *         type: integer
 *   responses:
 *     200:
 *       description: Account assignments retrieved successfully
 *     403:
 *       description: Caller is not a member of the team
 */
journalAccountAssignmentRoutes.get(
  '/',
  validateQuery(getJournalAccountAssignmentsQuerySchema),
  requireTeamMember('query.teamId'),
  getJournalAccountAssignments
);

/**
 * @openapi
 * /accounting/account-assignment:
 *  put:
 *   summary: Assign a counter-account to an eligible JournalEntry
 *   tags: [Accounting]
 *   security:
 *     - bearerAuth: []
 *   requestBody:
 *     required: true
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           required: [teamId, journalEntryId, accountId]
 *           properties:
 *             teamId:
 *               type: integer
 *             journalEntryId:
 *               type: string
 *               description: Lowercase transaction hash and JournalEntry identity
 *             accountId:
 *               type: string
 *               enum: [operating-expense, owner-capital, payroll-expense, interest-expense, dividend-expense]
 *             memo:
 *               type: string
 *   responses:
 *     200:
 *       description: Account assignment created or updated successfully
 *     403:
 *       description: Caller is not the owner of the team
 *     409:
 *       description: Team is archived and cannot be modified
 */
journalAccountAssignmentRoutes.put(
  '/',
  validateBody(upsertJournalAccountAssignmentBodySchema),
  requireTeamOwner('body.teamId'),
  rejectIfArchived('body.teamId'),
  upsertJournalAccountAssignment
);

/**
 * @openapi
 * /accounting/account-assignment:
 *  delete:
 *   summary: Restore the evidence-derived account of a JournalEntry
 *   tags: [Accounting]
 *   security:
 *     - bearerAuth: []
 *   parameters:
 *     - in: query
 *       name: teamId
 *       required: true
 *       schema:
 *         type: integer
 *     - in: query
 *       name: journalEntryId
 *       required: true
 *       schema:
 *         type: string
 *   responses:
 *     200:
 *       description: Account assignment removed successfully
 *     403:
 *       description: Caller is not the owner of the team
 *     404:
 *       description: Account assignment not found
 *     409:
 *       description: Team is archived and cannot be modified
 */
journalAccountAssignmentRoutes.delete(
  '/',
  validateQuery(deleteJournalAccountAssignmentQuerySchema),
  requireTeamOwner('query.teamId'),
  rejectIfArchived('query.teamId'),
  deleteJournalAccountAssignment
);

export default journalAccountAssignmentRoutes;
