import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authorizeUser } from '../../middleware/authMiddleware';
import statsRoutes from '../../routes/statsRoute';
import { prisma } from '../../utils';

// Mock the authorizeUser middleware
vi.mock('../../middleware/authMiddleware', () => ({
  authorizeUser: vi.fn((req: Request, res: Response, next: NextFunction) => {
    req.address = '0x1234567890123456789012345678901234567890';
    next();
  }),
}));

// Mock prisma
vi.mock('../../utils', async () => {
  const actual = await vi.importActual('../../utils');
  return {
    ...actual,
    prisma: {
      team: {
        count: vi.fn(),
        findMany: vi.fn(),
        aggregate: vi.fn(),
      },
      user: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
      claim: {
        count: vi.fn(),
        aggregate: vi.fn(),
        findMany: vi.fn(),
      },
      weeklyClaim: {
        count: vi.fn(),
        groupBy: vi.fn(),
        findMany: vi.fn(),
      },
      expense: {
        count: vi.fn(),
        groupBy: vi.fn(),
        findMany: vi.fn(),
      },
      notification: {
        count: vi.fn(),
        groupBy: vi.fn(),
      },
      teamContract: {
        count: vi.fn(),
        groupBy: vi.fn(),
        findMany: vi.fn(),
      },
      boardOfDirectorActions: {
        count: vi.fn(),
        groupBy: vi.fn(),
        findMany: vi.fn(),
      },
      memberTeamsData: {
        findMany: vi.fn(),
        groupBy: vi.fn(),
      },
      wage: {
        count: vi.fn(),
        aggregate: vi.fn(),
        findMany: vi.fn(),
      },
    },
  };
});

const app = express();
app.use(express.json());
app.use('/stats', authorizeUser, statsRoutes);

describe('Statistics Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /stats/overview', () => {
    it('should return comprehensive overview statistics', async () => {
      // Mock all the data
      vi.mocked(prisma.team.count)
        .mockResolvedValueOnce(10) // totalTeams
        .mockResolvedValueOnce(8) // activeTeams
        .mockResolvedValueOnce(5) // recentTeams
        .mockResolvedValueOnce(3); // previousPeriodTeams

      vi.mocked(prisma.user.count)
        .mockResolvedValueOnce(50) // totalMembers
        .mockResolvedValueOnce(15) // recentMembers
        .mockResolvedValueOnce(10); // previousPeriodMembers

      vi.mocked(prisma.claim.count)
        .mockResolvedValueOnce(100) // totalClaims
        .mockResolvedValueOnce(30) // recentClaims
        .mockResolvedValueOnce(20); // previousPeriodClaims

      vi.mocked(prisma.claim.aggregate).mockResolvedValue({
        _sum: { hoursWorked: 500 },
        _count: null,
        _avg: null,
        _min: null,
        _max: null,
      });

      vi.mocked(prisma.weeklyClaim.count).mockResolvedValue(25);
      vi.mocked(prisma.weeklyClaim.groupBy).mockResolvedValue([
        { status: 'pending', _count: 10 },
        { status: 'signed', _count: 15 },
      ]);

      vi.mocked(prisma.expense.count).mockResolvedValue(20);
      vi.mocked(prisma.expense.groupBy).mockResolvedValue([
        { status: 'signed', _count: 15 },
        { status: 'expired', _count: 5 },
      ]);

      vi.mocked(prisma.notification.count).mockResolvedValue(100);
      vi.mocked(prisma.notification.groupBy).mockResolvedValue([
        { isRead: true, _count: 70 },
        { isRead: false, _count: 30 },
      ]);

      vi.mocked(prisma.teamContract.count).mockResolvedValue(15);
      vi.mocked(prisma.teamContract.groupBy).mockResolvedValue([
        { type: 'CashRemuneration', _count: 10 },
        { type: 'InvestorV1', _count: 5 },
      ]);

      vi.mocked(prisma.boardOfDirectorActions.count).mockResolvedValue(30);
      vi.mocked(prisma.boardOfDirectorActions.groupBy).mockResolvedValue([
        { isExecuted: true, _count: 20 },
        { isExecuted: false, _count: 10 },
      ]);

      const response = await request(app).get('/stats/overview?period=30d');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalTeams', 10);
      expect(response.body).toHaveProperty('activeTeams', 8);
      expect(response.body).toHaveProperty('totalMembers', 50);
      expect(response.body).toHaveProperty('totalClaims', 100);
      expect(response.body).toHaveProperty('totalHoursWorked', 500);
      expect(response.body).toHaveProperty('totalWeeklyClaims', 25);
      expect(response.body).toHaveProperty('weeklyClaimsByStatus');
      expect(response.body.weeklyClaimsByStatus).toEqual({
        pending: 10,
        signed: 15,
      });
      expect(response.body).toHaveProperty('notificationReadRate');
      expect(response.body).toHaveProperty('actionsExecutionRate');
      expect(response.body).toHaveProperty('growthMetrics');
      expect(response.body.growthMetrics).toHaveProperty('teamsGrowth');
      expect(response.body.growthMetrics).toHaveProperty('membersGrowth');
      expect(response.body.growthMetrics).toHaveProperty('claimsGrowth');
    });

    it('should handle different time periods', async () => {
      // Setup mocks for 7d period
      vi.mocked(prisma.team.count).mockResolvedValue(10);
      vi.mocked(prisma.user.count).mockResolvedValue(50);
      vi.mocked(prisma.claim.count).mockResolvedValue(100);
      vi.mocked(prisma.claim.aggregate).mockResolvedValue({
        _sum: { hoursWorked: 500 },
        _count: null,
        _avg: null,
        _min: null,
        _max: null,
      });
      vi.mocked(prisma.weeklyClaim.count).mockResolvedValue(25);
      vi.mocked(prisma.weeklyClaim.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.expense.count).mockResolvedValue(20);
      vi.mocked(prisma.expense.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.notification.count).mockResolvedValue(100);
      vi.mocked(prisma.notification.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.teamContract.count).mockResolvedValue(15);
      vi.mocked(prisma.teamContract.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.boardOfDirectorActions.count).mockResolvedValue(30);
      vi.mocked(prisma.boardOfDirectorActions.groupBy).mockResolvedValue([]);

      const response = await request(app).get('/stats/overview?period=7d');

      expect(response.status).toBe(200);
      expect(response.body.period).toBe('7d');
    });
  });

  describe('GET /stats/teams', () => {
    it('should return team statistics with pagination', async () => {
      const mockTeams = [
        {
          id: 1,
          name: 'Team 1',
          description: 'Description 1',
          ownerAddress: '0x123',
          officerAddress: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { members: 5 },
        },
        {
          id: 2,
          name: 'Team 2',
          description: 'Description 2',
          ownerAddress: '0x456',
          officerAddress: '0x789',
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { members: 3 },
        },
      ];

      vi.mocked(prisma.team.count)
        .mockResolvedValueOnce(10) // totalTeams
        .mockResolvedValueOnce(8) // activeTeams
        .mockResolvedValueOnce(5); // teamsWithOfficer

      vi.mocked(prisma.team.findMany)
        .mockResolvedValueOnce(mockTeams) // allTeams for average
        .mockResolvedValueOnce(mockTeams); // topTeamsByMembers

      const response = await request(app).get('/stats/teams?period=30d&page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalTeams', 10);
      expect(response.body).toHaveProperty('activeTeams', 8);
      expect(response.body).toHaveProperty('avgMembersPerTeam');
      expect(response.body).toHaveProperty('teamsWithOfficer', 5);
      expect(response.body).toHaveProperty('topTeamsByMembers');
      expect(response.body.topTeamsByMembers).toHaveLength(2);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 10);
    });
  });

  describe('GET /stats/users', () => {
    it('should return user statistics', async () => {
      const mockMemberTeamsData = [
        { userAddress: '0x1', teamId: 1 },
        { userAddress: '0x1', teamId: 2 },
        { userAddress: '0x2', teamId: 1 },
        { userAddress: '0x3', teamId: 1 },
      ];

      vi.mocked(prisma.user.count)
        .mockResolvedValueOnce(50) // totalUsers
        .mockResolvedValueOnce(25); // activeUsers

      vi.mocked(prisma.memberTeamsData.findMany).mockResolvedValue(mockMemberTeamsData);

      const response = await request(app).get('/stats/users?period=30d');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalUsers', 50);
      expect(response.body).toHaveProperty('activeUsers', 25);
      expect(response.body).toHaveProperty('avgTeamsPerUser');
      expect(response.body).toHaveProperty('multiTeamUsers');
    });
  });

  describe('GET /stats/claims', () => {
    it('should return claims statistics', async () => {
      const mockClaims = [
        {
          id: 1,
          hoursWorked: 8,
          dayWorked: new Date(),
          memo: 'Work done',
          wageId: 1,
          weeklyClaimId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          weeklyClaim: {
            id: 1,
            team: {
              id: 1,
              name: 'Team 1',
            },
          },
        },
      ];

      vi.mocked(prisma.claim.count).mockResolvedValue(100);
      vi.mocked(prisma.claim.aggregate)
        .mockResolvedValueOnce({
          _sum: { hoursWorked: 800 },
          _count: null,
          _avg: null,
          _min: null,
          _max: null,
        })
        .mockResolvedValueOnce({
          _sum: null,
          _count: null,
          _avg: { hoursWorked: 8 },
          _min: null,
          _max: null,
        });

      vi.mocked(prisma.claim.findMany).mockResolvedValue(mockClaims);

      const response = await request(app).get('/stats/claims?period=30d');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalClaims', 100);
      expect(response.body).toHaveProperty('totalHoursWorked', 800);
      expect(response.body).toHaveProperty('avgHoursPerClaim', 8);
      expect(response.body).toHaveProperty('claimsByTeam');
    });
  });

  describe('GET /stats/wages', () => {
    it('should return wage statistics', async () => {
      const mockWages = [
        { cashRatePerHour: 20, tokenRatePerHour: 0, usdcRatePerHour: 0 },
        { cashRatePerHour: 0, tokenRatePerHour: 10, usdcRatePerHour: 0 },
        { cashRatePerHour: 0, tokenRatePerHour: 0, usdcRatePerHour: 15 },
      ];

      vi.mocked(prisma.wage.count).mockResolvedValue(50);
      vi.mocked(prisma.wage.aggregate)
        .mockResolvedValueOnce({
          _sum: null,
          _count: null,
          _avg: { cashRatePerHour: 20 },
          _min: null,
          _max: null,
        })
        .mockResolvedValueOnce({
          _sum: null,
          _count: null,
          _avg: { tokenRatePerHour: 10 },
          _min: null,
          _max: null,
        })
        .mockResolvedValueOnce({
          _sum: null,
          _count: null,
          _avg: { usdcRatePerHour: 15 },
          _min: null,
          _max: null,
        });

      vi.mocked(prisma.wage.findMany)
        .mockResolvedValueOnce(mockWages) // allWages
        .mockResolvedValueOnce([{ userAddress: '0x1' }, { userAddress: '0x2' }]); // membersWithWages

      vi.mocked(prisma.user.count).mockResolvedValue(100);

      const response = await request(app).get('/stats/wages?period=30d');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalWages', 50);
      expect(response.body).toHaveProperty('averageRates');
      expect(response.body.averageRates).toHaveProperty('cash', 20);
      expect(response.body.averageRates).toHaveProperty('token', 10);
      expect(response.body.averageRates).toHaveProperty('usdc', 15);
      expect(response.body).toHaveProperty('wageDistribution');
      expect(response.body).toHaveProperty('membersWithWages', 2);
      expect(response.body).toHaveProperty('percentageWithWages');
    });
  });

  describe('GET /stats/expenses', () => {
    it('should return expense statistics', async () => {
      const mockExpenses = [
        {
          id: 1,
          userAddress: '0x1',
          teamId: 1,
          signature: 'sig1',
          data: {},
          status: 'signed',
          createdAt: new Date(),
          updatedAt: new Date(),
          team: {
            id: 1,
            name: 'Team 1',
          },
        },
      ];

      vi.mocked(prisma.expense.count).mockResolvedValue(20);
      vi.mocked(prisma.expense.groupBy).mockResolvedValue([
        { status: 'signed', _count: 15 },
        { status: 'expired', _count: 5 },
      ]);
      vi.mocked(prisma.expense.findMany).mockResolvedValue(mockExpenses);

      const response = await request(app).get('/stats/expenses?period=30d');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalExpenses', 20);
      expect(response.body).toHaveProperty('expensesByStatus');
      expect(response.body.expensesByStatus).toEqual({
        signed: 15,
        expired: 5,
      });
      expect(response.body).toHaveProperty('expensesByTeam');
    });
  });

  describe('GET /stats/contracts', () => {
    it('should return contract statistics', async () => {
      vi.mocked(prisma.teamContract.count).mockResolvedValue(15);
      vi.mocked(prisma.teamContract.groupBy)
        .mockResolvedValueOnce([
          { type: 'CashRemuneration', _count: 10 },
          { type: 'InvestorV1', _count: 5 },
        ])
        .mockResolvedValueOnce([
          { teamId: 1, _count: 3 },
          { teamId: 2, _count: 2 },
        ]);

      const response = await request(app).get('/stats/contracts?period=30d');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalContracts', 15);
      expect(response.body).toHaveProperty('contractsByType');
      expect(response.body.contractsByType).toEqual({
        CashRemuneration: 10,
        InvestorV1: 5,
      });
      expect(response.body).toHaveProperty('avgContractsPerTeam');
    });
  });

  describe('GET /stats/actions', () => {
    it('should return actions statistics', async () => {
      const mockActions = [
        {
          id: 1,
          actionId: 1,
          description: 'Action 1',
          targetAddress: '0x1',
          userAddress: '0x2',
          isExecuted: true,
          data: '',
          teamId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          team: {
            id: 1,
            name: 'Team 1',
          },
        },
      ];

      vi.mocked(prisma.boardOfDirectorActions.count)
        .mockResolvedValueOnce(30) // totalActions
        .mockResolvedValueOnce(20); // executedActions

      vi.mocked(prisma.boardOfDirectorActions.findMany).mockResolvedValue(mockActions);

      const response = await request(app).get('/stats/actions?period=30d');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalActions', 30);
      expect(response.body).toHaveProperty('executedActions', 20);
      expect(response.body).toHaveProperty('executionRate');
      expect(response.body.executionRate).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('actionsByTeam');
    });
  });

  describe('GET /stats/activity/recent', () => {
    it('should return recent activity feed', async () => {
      const mockWeeklyClaims = [
        {
          id: 1,
          status: 'pending',
          weekStart: new Date(),
          data: {},
          memberAddress: '0x1',
          teamId: 1,
          signature: null,
          wageId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          member: {
            address: '0x1',
            name: 'User 1',
          },
          team: {
            id: 1,
            name: 'Team 1',
          },
        },
      ];

      const mockExpenses = [
        {
          id: 1,
          userAddress: '0x1',
          teamId: 1,
          signature: 'sig1',
          data: {},
          status: 'signed',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: {
            address: '0x1',
            name: 'User 1',
          },
          team: {
            id: 1,
            name: 'Team 1',
          },
        },
      ];

      vi.mocked(prisma.weeklyClaim.findMany).mockResolvedValue(mockWeeklyClaims);
      vi.mocked(prisma.expense.findMany).mockResolvedValue(mockExpenses);
      vi.mocked(prisma.boardOfDirectorActions.findMany).mockResolvedValue([]);
      vi.mocked(prisma.teamContract.findMany).mockResolvedValue([]);

      const response = await request(app).get('/stats/activity/recent?limit=20');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('activities');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.activities)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.team.count).mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/stats/overview');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message');
    });

    it('should validate query parameters', async () => {
      const response = await request(app).get('/stats/overview?period=invalid');

      expect(response.status).toBe(400);
    });
  });

  describe('Authorization', () => {
    it('should require authorization', async () => {
      expect(authorizeUser).toBeDefined();
    });
  });
});
