import express from 'express';

import { syncOfficerVersions } from '../controllers/officerVersionController';
import { validateBody, syncOfficerVersionsBodySchema } from '../validation';

const officerVersionRoutes = express.Router();

/**
 * @openapi
 * /admin/officer-versions/sync:
 *  post:
 *   summary: Realign every TeamOfficer.version with the on-chain generation
 *   tags: [Officer Versions]
 *   security:
 *     - bearerAuth: []
 *   description: |
 *     Walks every TeamOfficer row (historical generations included), detects the
 *     contract generation on-chain — `version()` for V2+, otherwise the ERC-1967
 *     beacon matched against the frozen version registry — and rewrites
 *     `version` with the resolved semver. Officers whose generation cannot be
 *     resolved are reported with `status: unresolved` and left untouched.
 *
 *     Admin only. Each Officer costs up to two RPC calls, so a large instance
 *     takes a while; run with `dryRun` first to preview the plan.
 *   requestBody:
 *     required: false
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             dryRun:
 *               type: boolean
 *               description: Resolve and report without writing anything.
 *   responses:
 *     200:
 *       description: Sync report
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               chainId:
 *                 type: integer
 *                 nullable: true
 *               dryRun:
 *                 type: boolean
 *               scanned:
 *                 type: integer
 *               updated:
 *                 type: integer
 *               unchanged:
 *                 type: integer
 *               unresolved:
 *                 type: integer
 *               results:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     officerId:
 *                       type: integer
 *                     teamId:
 *                       type: integer
 *                     teamName:
 *                       type: string
 *                     address:
 *                       type: string
 *                     isCurrent:
 *                       type: boolean
 *                     from:
 *                       type: string
 *                       nullable: true
 *                       description: The version stored before the sync.
 *                     to:
 *                       type: string
 *                       nullable: true
 *                       description: The resolved version, null when unresolved.
 *                     source:
 *                       type: string
 *                       nullable: true
 *                       enum: [onchain, beacon]
 *                     status:
 *                       type: string
 *                       enum: [updated, unchanged, unresolved]
 *     403:
 *       description: Caller is not an admin
 *     500:
 *       description: Internal server error
 */
officerVersionRoutes.post(
  '/sync',
  validateBody(syncOfficerVersionsBodySchema),
  syncOfficerVersions
);

export default officerVersionRoutes;
