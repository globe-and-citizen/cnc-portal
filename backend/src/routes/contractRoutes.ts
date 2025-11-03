import express from 'express';

import {
  getContracts,
  syncContracts,
  addContract,
  resetTeamContracts,
} from '../controllers/contractController';
import {
  validateBody,
  validateQuery,
  addContractBodySchema,
  syncContractsBodySchema,
  getContractsQuerySchema,
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

contractRoutes.delete('/reset', validateBody(syncContractsBodySchema), resetTeamContracts);

export default contractRoutes;
