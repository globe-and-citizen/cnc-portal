import express from 'express';

import {
  getContracts,
  syncContracts,
  addContract,
  resetTeamContracts,
  getTeamOfficers,
  createOfficer,
} from '../controllers/contractController';
import {
  validateBody,
  validateQuery,
  addContractBodySchema,
  syncContractsBodySchema,
  getContractsQuerySchema,
  createOfficerBodySchema,
} from '../validation';

const contractRoutes = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Contract:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The ID of the contract
 *         address:
 *           type: string
 *           description: The address of the contract
 *         type:
 *           type: string
 *           description: The type of the contract
 *         deployer:
 *           type: string
 *           description: The address of the deployer
 *         teamId:
 *           type: integer
 *           description: The ID of the associated team
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The timestamp when the contract was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The timestamp when the contract was last updated
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Error message
 */

/**
 * @openapi
 * /contract:
 *  post:
 *   summary: Add a new contract to a team
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
 *               minimum: 1
 *             contractAddress:
 *               type: string
 *               description: The address of the contract
 *             contractType:
 *               type: string
 *               description: The type of the contract
 *   responses:
 *     200:
 *       description: Contract added successfully
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Contract'
 *     400:
 *       description: Bad request
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     403:
 *       description: Forbidden
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
contractRoutes.post('/', validateBody(addContractBodySchema), addContract);

/**
 * @openapi
 * /contract:
 *  get:
 *   summary: Retrieve contracts for a specific team
 *   parameters:
 *     - in: query
 *       name: teamId
 *       required: true
 *       schema:
 *         type: integer
 *         description: The ID of the team
 *         minimum: 1
 *   responses:
 *     200:
 *       description: List of contracts retrieved successfully
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/Contract'
 *     400:
 *       description: Bad request
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     404:
 *       description: Not found
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
contractRoutes.get('/', validateQuery(getContractsQuerySchema), getContracts);

/**
 * @openapi
 * /contract/sync:
 *  put:
 *   summary: Sync contracts for a specific team
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
 *               minimum: 1
 *   responses:
 *     200:
 *       description: Contracts synced successfully
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               count:
 *                 type: integer
 *                 description: Number of contracts synced
 *     400:
 *       description: Bad request
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     403:
 *       description: Forbidden
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
contractRoutes.put('/sync', validateBody(syncContractsBodySchema), syncContracts);

/**
 * @openapi
 * /contract/officer:
 *  post:
 *   summary: Register a freshly deployed Officer contract on a team
 *   description: Updates the team's current officerAddress, records a new
 *     TeamOfficer entry with deploy metadata, and syncs the contracts the
 *     Officer governs in a single call. Intended to be called by the frontend
 *     right after a successful Officer deployment transaction.
 *   requestBody:
 *     required: true
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           required: [teamId, address]
 *           properties:
 *             teamId:
 *               type: integer
 *               minimum: 1
 *             address:
 *               type: string
 *               description: The newly deployed Officer contract address
 *             deployBlockNumber:
 *               type: integer
 *               description: Block number of the deploy transaction receipt
 *             deployedAt:
 *               type: string
 *               format: date-time
 *               description: Timestamp of the deploy transaction
 *   responses:
 *     200:
 *       description: Officer registered and contracts synced
 *     403:
 *       description: Caller is not the team owner
 *     404:
 *       description: Team not found
 *     500:
 *       description: Internal server error
 */
contractRoutes.post('/officer', validateBody(createOfficerBodySchema), createOfficer);

/**
 * @openapi
 * /contract/officers:
 *  get:
 *   summary: List Officer contract history for a team
 *   parameters:
 *     - in: query
 *       name: teamId
 *       required: true
 *       schema:
 *         type: integer
 *         description: The ID of the team
 *         minimum: 1
 *   responses:
 *     200:
 *       description: Ordered list of TeamOfficer rows, newest first. Each row
 *         includes its related contracts and an `isCurrent` flag indicating
 *         whether it matches the team's current `officerAddress`.
 *     404:
 *       description: Team not found
 *     500:
 *       description: Internal server error
 */
contractRoutes.get('/officers', validateQuery(getContractsQuerySchema), getTeamOfficers);

contractRoutes.delete('/reset', validateBody(syncContractsBodySchema), resetTeamContracts);

export default contractRoutes;
