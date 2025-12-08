import { Request, Response } from 'express';
import { prisma } from '../utils';
import { errorResponse } from '../utils/utils';

/**
 * Statistics Controller
 * Provides aggregated data for analytics and dashboard
 */

/**
 * Helper function to calculate date range based on period
 */
const getDateRange = (period: string) => {
  const now = new Date();
  switch (period) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case 'all':
    default:
      return new Date(0); // Beginning of time
  }
};

/**
 * GET /api/stats/overview
 * Get comprehensive overview statistics
 */
export const getOverviewStats = async (req: Request, res: Response) => {
  /*
  #swagger.tags = ['Statistics']
  #swagger.description = 'Get comprehensive overview statistics for the platform'
  */
  try {
    const { period = '30d' } = req.query;
    const startDate = getDateRange(period as string);

    const whereClause = { createdAt: { gte: startDate } };

    // Parallel execution of all stat queries
    const [
      totalTeams,
      activeTeams,
      totalMembers,
      totalClaims,
      totalHoursWorked,
      totalWeeklyClaims,
      weeklyClaimsByStatus,
      totalExpenses,
      expensesByStatus,
      totalNotifications,
      notificationStats,
      totalContracts,
      contractsByType,
      totalActions,
      actionsStats,
      // Growth metrics
      recentTeams,
      recentMembers,
      recentClaims,
      previousPeriodTeams,
      previousPeriodMembers,
      previousPeriodClaims,
    ] = await Promise.all([
      // Total teams in period
      prisma.team.count({
        where: whereClause,
      }),

      // Active teams (with activity in the period)
      prisma.team.count({
        where: {
          createdAt: { gte: startDate },
          OR: [
            { weeklyClaims: { some: { createdAt: { gte: startDate } } } },
            { Expense: { some: { createdAt: { gte: startDate } } } },
          ],
        },
      }),

      // Total members in period
      prisma.user.count({
        where: whereClause,
      }),

      // Total claims in period
      prisma.claim.count({
        where: whereClause,
      }),

      // Total hours worked in period
      prisma.claim.aggregate({
        where: whereClause,
        _sum: { hoursWorked: true },
      }),

      // Total weekly claims in period
      prisma.weeklyClaim.count({
        where: whereClause,
      }),

      // Weekly claims by status in period
      prisma.weeklyClaim.groupBy({
        by: ['status'],
        where: whereClause,
        _count: true,
      }),

      // Total expenses in period
      prisma.expense.count({
        where: whereClause,
      }),

      // Expenses by status in period
      prisma.expense.groupBy({
        by: ['status'],
        where: whereClause,
        _count: true,
      }),

      // Total notifications in period
      prisma.notification.count({
        where: whereClause,
      }),

      // Notification read stats in period
      prisma.notification.groupBy({
        by: ['isRead'],
        where: whereClause,
        _count: true,
      }),

      // Total contracts in period
      prisma.teamContract.count({
        where: whereClause,
      }),

      // Contracts by type in period
      prisma.teamContract.groupBy({
        by: ['type'],
        where: whereClause,
        _count: true,
      }),

      // Total actions in period
      prisma.boardOfDirectorActions.count({
        where: whereClause,
      }),

      // Actions by execution status in period
      prisma.boardOfDirectorActions.groupBy({
        by: ['isExecuted'],
        where: whereClause,
        _count: true,
      }),

      // Growth metrics - recent period (same as above for consistency)
      prisma.team.count({ where: whereClause }),
      prisma.user.count({ where: whereClause }),
      prisma.claim.count({ where: whereClause }),

      // Growth metrics - previous period (for comparison)
      prisma.team.count({
        where: {
          createdAt: {
            gte: new Date(startDate.getTime() - (Date.now() - startDate.getTime())),
            lt: startDate,
          },
        },
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(startDate.getTime() - (Date.now() - startDate.getTime())),
            lt: startDate,
          },
        },
      }),
      prisma.claim.count({
        where: {
          createdAt: {
            gte: new Date(startDate.getTime() - (Date.now() - startDate.getTime())),
            lt: startDate,
          },
        },
      }),
    ]);

    // Calculate read rate
    const readNotifications = notificationStats.find((n) => n.isRead === true)?._count || 0;
    const notificationReadRate =
      totalNotifications > 0 ? (readNotifications / totalNotifications) * 100 : 0;

    // Calculate execution rate
    const executedActions = actionsStats.find((a) => a.isExecuted === true)?._count || 0;
    const actionsExecutionRate = totalActions > 0 ? (executedActions / totalActions) * 100 : 0;

    // Calculate growth percentages
    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    res.status(200).json({
      totalTeams,
      activeTeams,
      totalMembers,
      totalClaims,
      totalHoursWorked: totalHoursWorked._sum.hoursWorked || 0,
      totalWeeklyClaims,
      weeklyClaimsByStatus: weeklyClaimsByStatus.reduce(
        (acc, item) => {
          acc[item.status || 'unknown'] = item._count;
          return acc;
        },
        {} as Record<string, number>
      ),
      totalExpenses,
      expensesByStatus: expensesByStatus.reduce(
        (acc, item) => {
          acc[item.status] = item._count;
          return acc;
        },
        {} as Record<string, number>
      ),
      totalNotifications,
      notificationReadRate: Math.round(notificationReadRate * 100) / 100,
      totalContracts,
      contractsByType: contractsByType.reduce(
        (acc, item) => {
          acc[item.type] = item._count;
          return acc;
        },
        {} as Record<string, number>
      ),
      totalActions,
      actionsExecutionRate: Math.round(actionsExecutionRate * 100) / 100,
      growthMetrics: {
        teamsGrowth: Math.round(calculateGrowth(recentTeams, previousPeriodTeams) * 100) / 100,
        membersGrowth:
          Math.round(calculateGrowth(recentMembers, previousPeriodMembers) * 100) / 100,
        claimsGrowth: Math.round(calculateGrowth(recentClaims, previousPeriodClaims) * 100) / 100,
      },
      period,
    });
  } catch (error: unknown) {
    console.error('Error fetching overview stats:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return errorResponse(500, message, res);
  }
};

/**
 * GET /api/stats/teams
 * Get team statistics
 */
export const getTeamsStats = async (req: Request, res: Response) => {
  /*
  #swagger.tags = ['Statistics']
  #swagger.description = 'Get detailed team statistics'
  */
  try {
    const { period = '30d', page = 1, limit = 10 } = req.query;
    const startDate = getDateRange(period as string);
    const skip = (Number(page) - 1) * Number(limit);
    const whereClause = { createdAt: { gte: startDate } };

    const [totalTeams, activeTeams, teamsWithOfficer, allTeams, topTeamsByMembers] =
      await Promise.all([
        // Total teams in period
        prisma.team.count({
          where: whereClause,
        }),

        // Active teams in period
        prisma.team.count({
          where: {
            createdAt: { gte: startDate },
            OR: [
              { weeklyClaims: { some: { createdAt: { gte: startDate } } } },
              { Expense: { some: { createdAt: { gte: startDate } } } },
            ],
          },
        }),

        // Teams with officer in period
        prisma.team.count({
          where: {
            ...whereClause,
            officerAddress: { not: null },
          },
        }),

        // All teams in period for average calculation
        prisma.team.findMany({
          where: whereClause,
          include: {
            _count: {
              select: { members: true },
            },
          },
        }),

        // Top teams by member count in period
        prisma.team.findMany({
          where: whereClause,
          take: Number(limit),
          skip,
          include: {
            _count: {
              select: { members: true },
            },
          },
        }),
      ]);

    // Calculate average members per team
    const totalMembersCount = allTeams.reduce((sum, team) => sum + team._count.members, 0);
    const avgMembersPerTeam = allTeams.length > 0 ? totalMembersCount / allTeams.length : 0;

    // Sort top teams by member count
    const sortedTopTeams = topTeamsByMembers.sort((a, b) => b._count.members - a._count.members);

    res.status(200).json({
      totalTeams,
      activeTeams,
      avgMembersPerTeam: Math.round(avgMembersPerTeam * 100) / 100,
      teamsWithOfficer,
      topTeamsByMembers: sortedTopTeams.map((team) => ({
        id: team.id,
        name: team.name,
        description: team.description,
        memberCount: team._count.members,
        createdAt: team.createdAt,
      })),
      period,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalTeams / Number(limit)),
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching team stats:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return errorResponse(500, message, res);
  }
};

/**
 * GET /api/stats/users
 * Get user statistics
 */
export const getUsersStats = async (req: Request, res: Response) => {
  /*
  #swagger.tags = ['Statistics']
  #swagger.description = 'Get detailed user statistics'
  */
  try {
    const { period = '30d', teamId, page = 1, limit = 10 } = req.query;
    const startDate = getDateRange(period as string);
    const whereClause = { createdAt: { gte: startDate } };

    const teamFilter = teamId ? { teamId: Number(teamId) } : {};

    const [totalUsers, activeUsers, allMemberTeamsData] = await Promise.all([
      // Total users in period
      prisma.user.count({
        where: whereClause,
      }),

      // Active users (with claims in period)
      prisma.user.count({
        where: {
          weeklyClaims: {
            some: {
              createdAt: { gte: startDate },
              ...teamFilter,
            },
          },
        },
      }),

      // All member-team relationships for calculations
      prisma.memberTeamsData.findMany({
        where: whereClause,
        select: {
          userAddress: true,
          teamId: true,
        },
      }),
    ]);

    // Calculate average teams per user
    const userTeamCounts = new Map<string, number>();
    allMemberTeamsData.forEach((mtd) => {
      userTeamCounts.set(mtd.userAddress, (userTeamCounts.get(mtd.userAddress) || 0) + 1);
    });
    const avgTeamsPerUser =
      userTeamCounts.size > 0
        ? Array.from(userTeamCounts.values()).reduce((sum, count) => sum + count, 0) /
        userTeamCounts.size
        : 0;

    // Count users in multiple teams
    const multiTeamUsers = Array.from(userTeamCounts.values()).filter((count) => count > 1).length;

    res.status(200).json({
      totalUsers,
      activeUsers,
      avgTeamsPerUser: Math.round(avgTeamsPerUser * 100) / 100,
      multiTeamUsers,
      period,
      pagination: {
        page: Number(page),
        limit: Number(limit),
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching user stats:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return errorResponse(500, message, res);
  }
};

/**
 * GET /api/stats/claims
 * Get claims and hours statistics
 */
export const getClaimsStats = async (req: Request, res: Response) => {
  /*
  #swagger.tags = ['Statistics']
  #swagger.description = 'Get detailed claims and hours statistics'
  */
  try {
    const { period = '30d' } = req.query;
    const startDate = getDateRange(period as string);

    const whereClause = {
      createdAt: { gte: startDate },
    };

    const [totalClaims, totalHoursWorked, avgHoursPerClaim, allClaims] = await Promise.all([
      // Total claims in period
      prisma.claim.count({
        where: whereClause,
      }),

      // Total hours worked
      prisma.claim.aggregate({
        where: whereClause,
        _sum: {
          hoursWorked: true,
        },
      }),

      // Average hours per claim
      prisma.claim.aggregate({
        where: whereClause,
        _avg: {
          hoursWorked: true,
        },
      }),

      // All claims with team info
      prisma.claim.findMany({
        where: whereClause,
        include: {
          weeklyClaim: {
            include: {
              team: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    // Group claims by team
    const teamClaimsMap = new Map<
      number,
      { teamName: string; claimCount: number; totalHours: number }
    >();
    allClaims.forEach((claim) => {
      if (claim.weeklyClaim) {
        const teamId = claim.weeklyClaim.team.id;
        const existing = teamClaimsMap.get(teamId) || {
          teamName: claim.weeklyClaim.team.name,
          claimCount: 0,
          totalHours: 0,
        };
        existing.claimCount++;
        existing.totalHours += claim.hoursWorked;
        teamClaimsMap.set(teamId, existing);
      }
    });

    const claimsByTeam = Array.from(teamClaimsMap.entries()).map(([teamId, data]) => ({
      teamId,
      teamName: data.teamName,
      claimCount: data.claimCount,
      totalHours: data.totalHours,
    }));

    res.status(200).json({
      totalClaims,
      totalHoursWorked: totalHoursWorked._sum.hoursWorked || 0,
      avgHoursPerClaim: Math.round((avgHoursPerClaim._avg.hoursWorked || 0) * 100) / 100,
      claimsByTeam,
      period,
    });
  } catch (error: unknown) {
    console.error('Error fetching claims stats:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return errorResponse(500, message, res);
  }
};

/**
 * GET /api/stats/wages
 * Get wage statistics
 */
export const getWagesStats = async (req: Request, res: Response) => {
  /*
  #swagger.tags = ['Statistics']
  #swagger.description = 'Get detailed wage statistics'
  */
  try {
    const { period = '30d', teamId } = req.query;
    const startDate = getDateRange(period as string);

    const whereClause = teamId
      ? { createdAt: { gte: startDate }, teamId: Number(teamId) }
      : { createdAt: { gte: startDate } };

    const [
      totalWages,
      avgCashRate,
      avgTokenRate,
      avgUsdcRate,
      allWages,
      membersWithWages,
      totalMembers,
    ] = await Promise.all([
      // Total wage records
      prisma.wage.count({
        where: whereClause,
      }),

      // Average cash rate
      prisma.wage.aggregate({
        where: whereClause,
        _avg: {
          cashRatePerHour: true,
        },
      }),

      // Average token rate
      prisma.wage.aggregate({
        where: whereClause,
        _avg: {
          tokenRatePerHour: true,
        },
      }),

      // Average USDC rate
      prisma.wage.aggregate({
        where: whereClause,
        _avg: {
          usdcRatePerHour: true,
        },
      }),

      // All wages for distribution
      prisma.wage.findMany({
        where: whereClause,
        select: {
          cashRatePerHour: true,
          tokenRatePerHour: true,
          usdcRatePerHour: true,
        },
      }),

      // Members with wages set
      prisma.wage.findMany({
        where: whereClause,
        distinct: ['userAddress'],
        select: {
          userAddress: true,
        },
      }),

      // Total members (for percentage calculation)
      prisma.user.count(),
    ]);

    // Count wage distribution by type
    const wageDistribution = {
      cash: allWages.filter((w) => w.cashRatePerHour > 0).length,
      token: allWages.filter((w) => w.tokenRatePerHour > 0).length,
      usdc: allWages.filter((w) => w.usdcRatePerHour > 0).length,
    };

    res.status(200).json({
      totalWages,
      averageRates: {
        cash: Math.round((avgCashRate._avg.cashRatePerHour || 0) * 100) / 100,
        token: Math.round((avgTokenRate._avg.tokenRatePerHour || 0) * 100) / 100,
        usdc: Math.round((avgUsdcRate._avg.usdcRatePerHour || 0) * 100) / 100,
      },
      wageDistribution,
      membersWithWages: membersWithWages.length,
      percentageWithWages:
        totalMembers > 0 ? Math.round((membersWithWages.length / totalMembers) * 10000) / 100 : 0,
      period,
    });
  } catch (error: unknown) {
    console.error('Error fetching wages stats:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return errorResponse(500, message, res);
  }
};

/**
 * GET /api/stats/expenses
 * Get expense statistics
 */
export const getExpensesStats = async (req: Request, res: Response) => {
  /*
  #swagger.tags = ['Statistics']
  #swagger.description = 'Get detailed expense statistics'
  */
  try {
    const { period = '30d', teamId, page = 1, limit = 10 } = req.query;
    const startDate = getDateRange(period as string);

    const whereClause = teamId
      ? { createdAt: { gte: startDate }, teamId: Number(teamId) }
      : { createdAt: { gte: startDate } };

    const [totalExpenses, expensesByStatus, allExpenses] = await Promise.all([
      // Total expenses
      prisma.expense.count({
        where: whereClause,
      }),

      // Expenses by status
      prisma.expense.groupBy({
        by: ['status'],
        where: whereClause,
        _count: true,
      }),

      // All expenses with team info
      prisma.expense.findMany({
        where: whereClause,
        include: {
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    // Group expenses by team
    const teamExpensesMap = new Map<
      number,
      { teamName: string; expenseCount: number; signedCount: number; expiredCount: number }
    >();
    allExpenses.forEach((expense) => {
      const teamId = expense.team.id;
      const existing = teamExpensesMap.get(teamId) || {
        teamName: expense.team.name,
        expenseCount: 0,
        signedCount: 0,
        expiredCount: 0,
      };
      existing.expenseCount++;
      if (expense.status === 'signed') existing.signedCount++;
      if (expense.status === 'expired') existing.expiredCount++;
      teamExpensesMap.set(teamId, existing);
    });

    const expensesByTeam = Array.from(teamExpensesMap.entries()).map(([teamId, data]) => ({
      teamId,
      teamName: data.teamName,
      expenseCount: data.expenseCount,
      signedCount: data.signedCount,
      expiredCount: data.expiredCount,
    }));

    res.status(200).json({
      totalExpenses,
      expensesByStatus: expensesByStatus.reduce(
        (acc, item) => {
          acc[item.status] = item._count;
          return acc;
        },
        {} as Record<string, number>
      ),
      expensesByTeam,
      period,
      pagination: {
        page: Number(page),
        limit: Number(limit),
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching expenses stats:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return errorResponse(500, message, res);
  }
};

/**
 * GET /api/stats/contracts
 * Get contract statistics
 */
export const getContractsStats = async (req: Request, res: Response) => {
  /*
  #swagger.tags = ['Statistics']
  #swagger.description = 'Get detailed contract statistics'
  */
  try {
    const { period = '30d', teamId } = req.query;
    const startDate = getDateRange(period as string);

    const whereClause = teamId
      ? { createdAt: { gte: startDate }, teamId: Number(teamId) }
      : { createdAt: { gte: startDate } };

    const [totalContracts, contractsByType, allContracts] = await Promise.all([
      // Total contracts
      prisma.teamContract.count({
        where: whereClause,
      }),

      // Contracts by type
      prisma.teamContract.groupBy({
        by: ['type'],
        where: whereClause,
        _count: true,
      }),

      // All contracts for team average
      prisma.teamContract.groupBy({
        by: ['teamId'],
        where: whereClause,
        _count: true,
      }),
    ]);

    // Calculate average contracts per team
    const avgContractsPerTeam =
      allContracts.length > 0
        ? allContracts.reduce((sum, item) => sum + item._count, 0) / allContracts.length
        : 0;

    res.status(200).json({
      totalContracts,
      contractsByType: contractsByType.reduce(
        (acc, item) => {
          acc[item.type] = item._count;
          return acc;
        },
        {} as Record<string, number>
      ),
      avgContractsPerTeam: Math.round(avgContractsPerTeam * 100) / 100,
      period,
    });
  } catch (error: unknown) {
    console.error('Error fetching contracts stats:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return errorResponse(500, message, res);
  }
};

/**
 * GET /api/stats/actions
 * Get Board of Director actions statistics
 */
export const getActionsStats = async (req: Request, res: Response) => {
  /*
  #swagger.tags = ['Statistics']
  #swagger.description = 'Get detailed Board of Director actions statistics'
  */
  try {
    const { period = '30d', teamId, page = 1, limit = 10 } = req.query;
    const startDate = getDateRange(period as string);

    const whereClause = teamId
      ? { createdAt: { gte: startDate }, teamId: Number(teamId) }
      : { createdAt: { gte: startDate } };

    const [totalActions, executedActions, allActions] = await Promise.all([
      // Total actions
      prisma.boardOfDirectorActions.count({
        where: whereClause,
      }),

      // Executed actions
      prisma.boardOfDirectorActions.count({
        where: {
          ...whereClause,
          isExecuted: true,
        },
      }),

      // All actions with team info
      prisma.boardOfDirectorActions.findMany({
        where: whereClause,
        include: {
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    // Group actions by team
    const teamActionsMap = new Map<
      number,
      { teamName: string; actionCount: number; executedCount: number }
    >();
    allActions.forEach((action) => {
      const teamId = action.team.id;
      const existing = teamActionsMap.get(teamId) || {
        teamName: action.team.name,
        actionCount: 0,
        executedCount: 0,
      };
      existing.actionCount++;
      if (action.isExecuted) existing.executedCount++;
      teamActionsMap.set(teamId, existing);
    });

    const actionsByTeam = Array.from(teamActionsMap.entries()).map(([teamId, data]) => ({
      teamId,
      teamName: data.teamName,
      actionCount: data.actionCount,
      executedCount: data.executedCount,
      executionRate:
        data.actionCount > 0
          ? Math.round((data.executedCount / data.actionCount) * 10000) / 100
          : 0,
    }));

    const executionRate = totalActions > 0 ? (executedActions / totalActions) * 100 : 0;

    res.status(200).json({
      totalActions,
      executedActions,
      executionRate: Math.round(executionRate * 100) / 100,
      actionsByTeam,
      period,
      pagination: {
        page: Number(page),
        limit: Number(limit),
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching actions stats:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return errorResponse(500, message, res);
  }
};

/**
 * GET /api/stats/activity/recent
 * Get recent activity across the platform
 */
export const getRecentActivity = async (req: Request, res: Response) => {
  /*
  #swagger.tags = ['Statistics']
  #swagger.description = 'Get recent activity feed across the platform'
  */
  try {
    const { limit = 20, teamId } = req.query;
    const teamFilter = teamId ? { teamId: Number(teamId) } : {};

    // Get recent activities from different sources
    const [recentClaims, recentExpenses, recentActions, recentContracts] = await Promise.all([
      // Recent weekly claims
      prisma.weeklyClaim.findMany({
        where: teamFilter,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          member: {
            select: {
              address: true,
              name: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),

      // Recent expenses
      prisma.expense.findMany({
        where: teamFilter,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              address: true,
              name: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),

      // Recent actions
      prisma.boardOfDirectorActions.findMany({
        where: teamFilter,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: {
              address: true,
              name: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),

      // Recent contracts
      prisma.teamContract.findMany({
        where: teamFilter,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    // Combine and format activities
    const activities = [
      ...recentClaims.map((claim) => ({
        type: 'claim',
        id: claim.id,
        description: `Weekly claim submitted`,
        user: claim.member,
        team: claim.team,
        status: claim.status,
        createdAt: claim.createdAt,
      })),
      ...recentExpenses.map((expense) => ({
        type: 'expense',
        id: expense.id,
        description: `Expense ${expense.status}`,
        user: expense.user,
        team: expense.team,
        status: expense.status,
        createdAt: expense.createdAt,
      })),
      ...recentActions.map((action) => ({
        type: 'action',
        id: action.id,
        description: action.description,
        user: action.createdBy,
        team: action.team,
        status: action.isExecuted ? 'executed' : 'pending',
        createdAt: action.createdAt,
      })),
      ...recentContracts.map((contract) => ({
        type: 'contract',
        id: contract.id,
        description: `${contract.type} contract deployed`,
        user: { address: contract.deployer, name: null },
        team: contract.team,
        status: 'deployed',
        createdAt: contract.createdAt,
      })),
    ];

    // Sort by createdAt and limit
    activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const limitedActivities = activities.slice(0, Number(limit));

    res.status(200).json({
      activities: limitedActivities,
      total: limitedActivities.length,
    });
  } catch (error: unknown) {
    console.error('Error fetching recent activity:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return errorResponse(500, message, res);
  }
};
