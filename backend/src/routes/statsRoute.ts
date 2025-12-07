import express from 'express';
import {
  getOverviewStats,
  getTeamsStats,
  getUsersStats,
  getClaimsStats,
  getWagesStats,
  getExpensesStats,
  getContractsStats,
  getActionsStats,
  getRecentActivity,
} from '../controllers/statsController';
import { validateQuery } from '../validation/middleware/validate';
import {
  statsOverviewQuerySchema,
  teamStatsQuerySchema,
  userStatsQuerySchema,
  claimsStatsQuerySchema,
  wagesStatsQuerySchema,
  expensesStatsQuerySchema,
  contractsStatsQuerySchema,
  actionsStatsQuerySchema,
  recentActivityQuerySchema,
} from '../validation/schemas/stats';

const statsRoutes = express.Router();

/**
 * Statistics routes
 * All routes are protected by authorizeUser middleware (applied in serverConfig.ts)
 */

/**
 * @openapi
 * /stats/overview:
 *  get:
 *   summary: Get comprehensive platform statistics
 *   tags:
 *     - Statistics
 *   parameters:
 *     - in: query
 *       name: period
 *       schema:
 *         type: string
 *         enum: ['7d', '30d', '90d', 'all']
 *         default: '30d'
 *       description: Time period for statistics
 *     - in: query
 *       name: teamId
 *       schema:
 *         type: integer
 *         minimum: 1
 *       description: Optional team ID to filter statistics
 *   responses:
 *     200:
 *       description: Overview statistics retrieved successfully
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               totalTeams:
 *                 type: integer
 *               activeTeams:
 *                 type: integer
 *               totalMembers:
 *                 type: integer
 *               totalClaims:
 *                 type: integer
 *               totalHoursWorked:
 *                 type: number
 *               totalWeeklyClaims:
 *                 type: integer
 *               weeklyClaimsByStatus:
 *                 type: object
 *               totalExpenses:
 *                 type: integer
 *               expensesByStatus:
 *                 type: object
 *               totalNotifications:
 *                 type: integer
 *               notificationReadRate:
 *                 type: number
 *               totalContracts:
 *                 type: integer
 *               contractsByType:
 *                 type: object
 *               totalActions:
 *                 type: integer
 *               actionsExecutionRate:
 *                 type: number
 *               growthMetrics:
 *                 type: object
 *                 properties:
 *                   teamsGrowth:
 *                     type: number
 *                   membersGrowth:
 *                     type: number
 *                   claimsGrowth:
 *                     type: number
 *               period:
 *                 type: string
 *     400:
 *       description: Bad request
 *     500:
 *       description: Internal server error
 */
statsRoutes.get('/overview', validateQuery(statsOverviewQuerySchema), getOverviewStats);

/**
 * @openapi
 * /stats/teams:
 *  get:
 *   summary: Get team statistics
 *   tags:
 *     - Statistics
 *   parameters:
 *     - in: query
 *       name: period
 *       schema:
 *         type: string
 *         enum: ['7d', '30d', '90d', 'all']
 *         default: '30d'
 *       description: Time period for statistics
 *     - in: query
 *       name: page
 *       schema:
 *         type: integer
 *         minimum: 1
 *         default: 1
 *       description: Page number for pagination
 *     - in: query
 *       name: limit
 *       schema:
 *         type: integer
 *         minimum: 1
 *         maximum: 100
 *         default: 10
 *       description: Number of items per page
 *   responses:
 *     200:
 *       description: Team statistics retrieved successfully
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               totalTeams:
 *                 type: integer
 *               activeTeams:
 *                 type: integer
 *               avgMembersPerTeam:
 *                 type: number
 *               teamsWithOfficer:
 *                 type: integer
 *               topTeamsByMembers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     memberCount:
 *                       type: integer
 *                     createdAt:
 *                       type: string
 *               period:
 *                 type: string
 *               pagination:
 *                 type: object
 *                 properties:
 *                   page:
 *                     type: integer
 *                   limit:
 *                     type: integer
 *                   totalPages:
 *                     type: integer
 *     400:
 *       description: Bad request
 *     500:
 *       description: Internal server error
 */
statsRoutes.get('/teams', validateQuery(teamStatsQuerySchema), getTeamsStats);

/**
 * @openapi
 * /stats/users:
 *  get:
 *   summary: Get user statistics
 *   tags:
 *     - Statistics
 *   parameters:
 *     - in: query
 *       name: period
 *       schema:
 *         type: string
 *         enum: ['7d', '30d', '90d', 'all']
 *         default: '30d'
 *       description: Time period for statistics
 *     - in: query
 *       name: teamId
 *       schema:
 *         type: integer
 *         minimum: 1
 *       description: Optional team ID to filter statistics
 *     - in: query
 *       name: page
 *       schema:
 *         type: integer
 *         minimum: 1
 *         default: 1
 *       description: Page number for pagination
 *     - in: query
 *       name: limit
 *       schema:
 *         type: integer
 *         minimum: 1
 *         maximum: 100
 *         default: 10
 *       description: Number of items per page
 *   responses:
 *     200:
 *       description: User statistics retrieved successfully
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               totalUsers:
 *                 type: integer
 *               activeUsers:
 *                 type: integer
 *               avgTeamsPerUser:
 *                 type: number
 *               multiTeamUsers:
 *                 type: integer
 *               period:
 *                 type: string
 *               pagination:
 *                 type: object
 *     400:
 *       description: Bad request
 *     500:
 *       description: Internal server error
 */
statsRoutes.get('/users', validateQuery(userStatsQuerySchema), getUsersStats);

/**
 * @openapi
 * /stats/claims:
 *  get:
 *   summary: Get claims and hours statistics
 *   tags:
 *     - Statistics
 *   parameters:
 *     - in: query
 *       name: period
 *       schema:
 *         type: string
 *         enum: ['7d', '30d', '90d', 'all']
 *         default: '30d'
 *       description: Time period for statistics
 *     - in: query
 *       name: teamId
 *       schema:
 *         type: integer
 *         minimum: 1
 *       description: Optional team ID to filter statistics
 *   responses:
 *     200:
 *       description: Claims statistics retrieved successfully
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               totalClaims:
 *                 type: integer
 *               totalHoursWorked:
 *                 type: number
 *               avgHoursPerClaim:
 *                 type: number
 *               claimsByTeam:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     teamId:
 *                       type: integer
 *                     teamName:
 *                       type: string
 *                     claimCount:
 *                       type: integer
 *                     totalHours:
 *                       type: number
 *               period:
 *                 type: string
 *     400:
 *       description: Bad request
 *     500:
 *       description: Internal server error
 */
statsRoutes.get('/claims', validateQuery(claimsStatsQuerySchema), getClaimsStats);

/**
 * @openapi
 * /stats/wages:
 *  get:
 *   summary: Get wage statistics
 *   tags:
 *     - Statistics
 *   parameters:
 *     - in: query
 *       name: period
 *       schema:
 *         type: string
 *         enum: ['7d', '30d', '90d', 'all']
 *         default: '30d'
 *       description: Time period for statistics
 *     - in: query
 *       name: teamId
 *       schema:
 *         type: integer
 *         minimum: 1
 *       description: Optional team ID to filter statistics
 *   responses:
 *     200:
 *       description: Wage statistics retrieved successfully
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               totalWages:
 *                 type: integer
 *               averageRates:
 *                 type: object
 *                 properties:
 *                   cash:
 *                     type: number
 *                   token:
 *                     type: number
 *                   usdc:
 *                     type: number
 *               wageDistribution:
 *                 type: object
 *                 properties:
 *                   cash:
 *                     type: integer
 *                   token:
 *                     type: integer
 *                   usdc:
 *                     type: integer
 *               membersWithWages:
 *                 type: integer
 *               percentageWithWages:
 *                 type: number
 *               period:
 *                 type: string
 *     400:
 *       description: Bad request
 *     500:
 *       description: Internal server error
 */
statsRoutes.get('/wages', validateQuery(wagesStatsQuerySchema), getWagesStats);

/**
 * @openapi
 * /stats/expenses:
 *  get:
 *   summary: Get expense statistics
 *   tags:
 *     - Statistics
 *   parameters:
 *     - in: query
 *       name: period
 *       schema:
 *         type: string
 *         enum: ['7d', '30d', '90d', 'all']
 *         default: '30d'
 *       description: Time period for statistics
 *     - in: query
 *       name: teamId
 *       schema:
 *         type: integer
 *         minimum: 1
 *       description: Optional team ID to filter statistics
 *     - in: query
 *       name: page
 *       schema:
 *         type: integer
 *         minimum: 1
 *         default: 1
 *       description: Page number for pagination
 *     - in: query
 *       name: limit
 *       schema:
 *         type: integer
 *         minimum: 1
 *         maximum: 100
 *         default: 10
 *       description: Number of items per page
 *   responses:
 *     200:
 *       description: Expense statistics retrieved successfully
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               totalExpenses:
 *                 type: integer
 *               expensesByStatus:
 *                 type: object
 *               expensesByTeam:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     teamId:
 *                       type: integer
 *                     teamName:
 *                       type: string
 *                     expenseCount:
 *                       type: integer
 *                     signedCount:
 *                       type: integer
 *                     expiredCount:
 *                       type: integer
 *               period:
 *                 type: string
 *               pagination:
 *                 type: object
 *     400:
 *       description: Bad request
 *     500:
 *       description: Internal server error
 */
statsRoutes.get('/expenses', validateQuery(expensesStatsQuerySchema), getExpensesStats);

/**
 * @openapi
 * /stats/contracts:
 *  get:
 *   summary: Get contract statistics
 *   tags:
 *     - Statistics
 *   parameters:
 *     - in: query
 *       name: period
 *       schema:
 *         type: string
 *         enum: ['7d', '30d', '90d', 'all']
 *         default: '30d'
 *       description: Time period for statistics
 *     - in: query
 *       name: teamId
 *       schema:
 *         type: integer
 *         minimum: 1
 *       description: Optional team ID to filter statistics
 *   responses:
 *     200:
 *       description: Contract statistics retrieved successfully
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               totalContracts:
 *                 type: integer
 *               contractsByType:
 *                 type: object
 *               avgContractsPerTeam:
 *                 type: number
 *               period:
 *                 type: string
 *     400:
 *       description: Bad request
 *     500:
 *       description: Internal server error
 */
statsRoutes.get('/contracts', validateQuery(contractsStatsQuerySchema), getContractsStats);

/**
 * @openapi
 * /stats/actions:
 *  get:
 *   summary: Get Board of Director actions statistics
 *   tags:
 *     - Statistics
 *   parameters:
 *     - in: query
 *       name: period
 *       schema:
 *         type: string
 *         enum: ['7d', '30d', '90d', 'all']
 *         default: '30d'
 *       description: Time period for statistics
 *     - in: query
 *       name: teamId
 *       schema:
 *         type: integer
 *         minimum: 1
 *       description: Optional team ID to filter statistics
 *     - in: query
 *       name: page
 *       schema:
 *         type: integer
 *         minimum: 1
 *         default: 1
 *       description: Page number for pagination
 *     - in: query
 *       name: limit
 *       schema:
 *         type: integer
 *         minimum: 1
 *         maximum: 100
 *         default: 10
 *       description: Number of items per page
 *   responses:
 *     200:
 *       description: Board actions statistics retrieved successfully
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               totalActions:
 *                 type: integer
 *               executedActions:
 *                 type: integer
 *               executionRate:
 *                 type: number
 *               actionsByTeam:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     teamId:
 *                       type: integer
 *                     teamName:
 *                       type: string
 *                     actionCount:
 *                       type: integer
 *                     executedCount:
 *                       type: integer
 *                     executionRate:
 *                       type: number
 *               period:
 *                 type: string
 *               pagination:
 *                 type: object
 *     400:
 *       description: Bad request
 *     500:
 *       description: Internal server error
 */
statsRoutes.get('/actions', validateQuery(actionsStatsQuerySchema), getActionsStats);

/**
 * @openapi
 * /stats/activity/recent:
 *  get:
 *   summary: Get recent activity feed
 *   tags:
 *     - Statistics
 *   parameters:
 *     - in: query
 *       name: limit
 *       schema:
 *         type: integer
 *         minimum: 1
 *         maximum: 100
 *         default: 20
 *       description: Number of activities to return
 *     - in: query
 *       name: teamId
 *       schema:
 *         type: integer
 *         minimum: 1
 *       description: Optional team ID to filter activities
 *   responses:
 *     200:
 *       description: Recent activity feed retrieved successfully
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               activities:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: ['claim', 'expense', 'action', 'contract']
 *                     id:
 *                       type: integer
 *                     description:
 *                       type: string
 *                     user:
 *                       type: object
 *                       properties:
 *                         address:
 *                           type: string
 *                         name:
 *                           type: string
 *                     team:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         name:
 *                           type: string
 *                     status:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *               total:
 *                 type: integer
 *     400:
 *       description: Bad request
 *     500:
 *       description: Internal server error
 */
statsRoutes.get('/activity/recent', validateQuery(recentActivityQuerySchema), getRecentActivity);

export default statsRoutes;
