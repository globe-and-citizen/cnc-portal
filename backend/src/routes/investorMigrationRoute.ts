import express from 'express';
import {
  createInvestorMigration,
  getInvestorMigration,
} from '../controllers/investorMigrationController';
import { rejectIfArchived, requireTeamMember } from '../middleware/teamAuthzMiddleware';
import {
  createInvestorMigrationBodySchema,
  getInvestorMigrationQuerySchema,
  validateBody,
  validateQuery,
} from '../validation';

const investorMigrationRoutes = express.Router();

/**
 * @openapi
 * /investor-migration:
 *  post:
 *   summary: Persist the frozen shareholder snapshot an Investor v1->v2 Merkle migration was built from
 *   tags: [InvestorMigration]
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
 *             previousInvestorAddress:
 *               type: string
 *             newInvestorAddress:
 *               type: string
 *             merkleRoot:
 *               type: string
 *             blockNumber:
 *               type: integer
 *             shareholders:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   shareholder:
 *                     type: string
 *                   amount:
 *                     type: string
 *   responses:
 *     201:
 *       description: Migration snapshot persisted successfully
 *     400:
 *       description: Bad request
 *     403:
 *       description: Caller is not the owner of the new Investor contract
 *     409:
 *       description: Team is archived and cannot be modified
 *     500:
 *       description: Internal server error
 */
investorMigrationRoutes.post(
  '/',
  validateBody(createInvestorMigrationBodySchema),
  rejectIfArchived('body.teamId'),
  requireTeamMember('body.teamId'),
  createInvestorMigration
);

/**
 * @openapi
 * /investor-migration:
 *  get:
 *   summary: Get the persisted migration snapshot for a team, if any
 *   tags: [InvestorMigration]
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
 *       description: Migration snapshot retrieved successfully
 *     400:
 *       description: Bad request
 *     403:
 *       description: Caller is not a member of the team
 *     404:
 *       description: No migration found for this team
 *     500:
 *       description: Internal server error
 */
investorMigrationRoutes.get(
  '/',
  validateQuery(getInvestorMigrationQuerySchema),
  requireTeamMember('query.teamId'),
  getInvestorMigration
);

export default investorMigrationRoutes;
