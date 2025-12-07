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

// GET /api/stats/overview - Get comprehensive platform statistics
statsRoutes.get('/overview', validateQuery(statsOverviewQuerySchema), getOverviewStats);

// GET /api/stats/teams - Get team statistics
statsRoutes.get('/teams', validateQuery(teamStatsQuerySchema), getTeamsStats);

// GET /api/stats/users - Get user statistics
statsRoutes.get('/users', validateQuery(userStatsQuerySchema), getUsersStats);

// GET /api/stats/claims - Get claims and hours statistics
statsRoutes.get('/claims', validateQuery(claimsStatsQuerySchema), getClaimsStats);

// GET /api/stats/wages - Get wage statistics
statsRoutes.get('/wages', validateQuery(wagesStatsQuerySchema), getWagesStats);

// GET /api/stats/expenses - Get expense statistics
statsRoutes.get('/expenses', validateQuery(expensesStatsQuerySchema), getExpensesStats);

// GET /api/stats/contracts - Get contract statistics
statsRoutes.get('/contracts', validateQuery(contractsStatsQuerySchema), getContractsStats);

// GET /api/stats/actions - Get Board of Director actions statistics
statsRoutes.get('/actions', validateQuery(actionsStatsQuerySchema), getActionsStats);

// GET /api/stats/activity/recent - Get recent activity feed
statsRoutes.get('/activity/recent', validateQuery(recentActivityQuerySchema), getRecentActivity);

export default statsRoutes;
