import express from 'express';
import {
  addFixedReturnOffering,
  getFixedReturnOfferings,
} from '../controllers/fixedReturnOfferingController';
import { rejectIfArchived, requireTeamMember } from '../middleware/teamAuthzMiddleware';
import {
  addFixedReturnOfferingBodySchema,
  getFixedReturnOfferingsQuerySchema,
  validateBody,
  validateQuery,
} from '../validation';

const fixedReturnOfferingRoutes = express.Router();

/**
 * @openapi
 * /fixed-return-offering:
 *  post:
 *   summary: Persist off-chain metadata (title/purpose) for a FixedReturn lending offer
 *   tags: [FixedReturnOffering]
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
 *             offerId:
 *               type: integer
 *               description: The on-chain offerId returned by createLendingOffer
 *             title:
 *               type: string
 *               description: The offering title
 *             purpose:
 *               type: string
 *               description: The offering purpose/description
 *   responses:
 *     201:
 *       description: Offering metadata created successfully
 *     400:
 *       description: Bad request
 *     403:
 *       description: Caller is not the owner of the FixedReturn contract
 *     404:
 *       description: FixedReturn contract not found for this team
 *     409:
 *       description: Team is archived and cannot be modified
 *     500:
 *       description: Internal server error
 */
fixedReturnOfferingRoutes.post(
  '/',
  validateBody(addFixedReturnOfferingBodySchema),
  rejectIfArchived('body.teamId'),
  requireTeamMember('body.teamId'),
  addFixedReturnOffering
);

/**
 * @openapi
 * /fixed-return-offering:
 *  get:
 *   summary: Get FixedReturn offering metadata for a team
 *   tags: [FixedReturnOffering]
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
 *       name: offerId
 *       required: false
 *       schema:
 *         type: integer
 *         description: Filter to a single offering by its on-chain offerId
 *   responses:
 *     200:
 *       description: Offerings retrieved successfully
 *     400:
 *       description: Bad request
 *     403:
 *       description: Caller is not a member of the team
 *     500:
 *       description: Internal server error
 */
fixedReturnOfferingRoutes.get(
  '/',
  validateQuery(getFixedReturnOfferingsQuerySchema),
  requireTeamMember('query.teamId'),
  getFixedReturnOfferings
);

export default fixedReturnOfferingRoutes;
