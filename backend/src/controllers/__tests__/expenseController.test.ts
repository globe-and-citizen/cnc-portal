import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { prisma } from '../../utils';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { Expense, Team } from '@prisma/client';
import publicClient from '../../utils/viem.config';
import expenseRoutes from '../../routes/expenseRoute';
import { authorizeUser } from '../../middleware/authMiddleware';

// Mock the authorizeUser middleware
vi.mock('../../middleware/authMiddleware', () => ({
  authorizeUser: vi.fn((req: Request, res: Response, next: NextFunction) => {
    (req as any).address = '0x1234567890123456789012345678901234567890';
    next();
  }),
}));

// Mock prisma
vi.mock('../../utils', async () => {
  const actual = await vi.importActual('../../utils');
  return {
    ...actual,
    prisma: {
      expense: {
        create: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        findUnique: vi.fn(),
      },
      team: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
      teamContract: {
        findFirst: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      teamMember: {
        findUnique: vi.fn(),
      },
    },
  };
});

// Mock viem config
vi.mock('../../utils/viem.config', () => ({
  default: {
    readContract: vi.fn(),
  },
}));

const app = express();
app.use(express.json());
app.use('/', authorizeUser, expenseRoutes);

const mockExpenseData = {
  approvedAddress: '0x1234567890123456789012345678901234567890',
  budgetData: [
    { budgetType: 0, value: 10 },
    { budgetType: 1, value: 100 },
    { budgetType: 2, value: 10 },
  ],
  tokenAddress: '0x1111111111111111111111111111111111111111',
  expiry: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
};

// Helper function to create variations of expense data for testing
const createExpenseData = (
  overrides: Partial<typeof mockExpenseData> = {}
) => ({
  ...mockExpenseData,
  ...overrides,
});

const mockExpense = {
  id: 1,
  teamId: 1,
  userAddress: '0x1234567890123456789012345678901234567890',
  signature: 'mockSignature',
  data: JSON.stringify(mockExpenseData),
  status: 'signed',
} as Expense;

const mockTeam = {
  id: 1,
  name: 'TeamName',
  ownerAddress: '0x1234567890123456789012345678901234567890',
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as Team;

describe('Expense Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST: /', () => {
    it('should return 400 if required parameters are missing', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue('0x123');
      const response = await request(app).post('/').send({ teamId: 1 });

      expect(response.status).toBe(400);

      expect(response.body.message).toContain('Invalid request body');
    });

    it('Should return 403 if the caller is not the owner of the team', async () => {
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValueOnce(null);
      const response = await request(app).post('/').send({
        teamId: 1,
        signature: 'mockSignature',
        data: mockExpenseData,
      });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Caller is not the owner of the team');
    });
    it('should create a new expense', async () => {
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValueOnce(mockTeam);
      vi.spyOn(prisma.teamContract, 'findFirst').mockResolvedValueOnce({
        id: 1,
        teamId: 1,
        address: '0x1234567890123456789012345678901234567890',
        type: 'ExpenseAccountEIP712',
        deployer: '0x1234567890123456789012345678901234567890',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.spyOn(prisma.expense, 'create').mockResolvedValueOnce(mockExpense);

      // Mock contract owner to match caller address
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(
        '0x1234567890123456789012345678901234567890'
      );


      const response = await request(app).post('/').send({
        teamId: 1,
        signature: '0xmockSignature',
        data: mockExpenseData,
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockExpense);
    });

    it('should return 500 if there is a server error', async () => {
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValueOnce(mockTeam);
      vi.spyOn(prisma.teamContract, 'findFirst').mockResolvedValueOnce({
        id: 1,
        teamId: 1,
        address: '0x1234567890123456789012345678901234567890',
        type: 'ExpenseAccountEIP712',
        deployer: '0x1234567890123456789012345678901234567890',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.spyOn(prisma.expense, 'create').mockRejectedValue('Server error');
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(
        '0x1234567890123456789012345678901234567890'
      );

      const response = await request(app).post('/').send({
        teamId: 1,
        signature: 'mockSignature',
        data: mockExpenseData,
      });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error has occured');
    });
  });


  describe('GET: /', () => {
    it('should return 400 if teamId is invalid', async () => {
      const response = await request(app).get('/').query({ teamId: 'abc' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid query parameters - teamId: Must be a number');
    });

    it('should return 403 if caller is not a team member', async () => {
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue(null);

      const response = await request(app).get('/').query({ teamId: 1 });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Caller is not a member of the team');
    });

    it('should return expenses for a valid team', async () => {
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue(mockTeam);
      vi.spyOn(prisma.expense, 'findMany').mockResolvedValue([
        { ...mockExpense, data: mockExpenseData },
      ]);
      vi.spyOn(prisma.teamContract, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma.expense, 'update').mockResolvedValue(mockExpense);
      vi.spyOn(publicClient, 'readContract').mockResolvedValue([0n, 0n, 1]);

      const response = await request(app).get('/').query({ teamId: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          ...mockExpense,
          data: mockExpenseData,
          status: 'enabled',
          balances: {
            0: '0',
            1: '0',
          },
        },
      ]);
    });

    it("should filter expenses by status when status is provided", async () => {
      vi.spyOn(prisma.team, "findFirst").mockResolvedValue(mockTeam);
      vi.spyOn(prisma.expense, "findMany").mockResolvedValue([
        {
          ...mockExpense,
          status: "signed",
          data: JSON.parse(mockExpense.data as string),
        },
      ]);
      vi.spyOn(prisma.teamContract, "findFirst").mockResolvedValue(null);
      vi.spyOn(prisma.expense, "update").mockResolvedValue(mockExpense);
      vi.spyOn(publicClient, "readContract").mockResolvedValue([0n, 0n, 1]);

      const response = await request(app)
        .get("/")
        .query({ teamId: 1, status: "signed" });

      expect(response.status).toBe(200);
      expect(prisma.expense.findMany).toHaveBeenCalledWith({
        where: { teamId: 1, status: "signed" },
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              name: true,
              address: true,
              imageUrl: true,
            },
          },
        },
      });
    });

 
    it('should return 500 if there is a server error', async () => {
      vi.spyOn(prisma.team, 'findFirst').mockRejectedValue('Server error');

      const response = await request(app).get('/').query({ teamId: 1 });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error has occured');
    });
  });

  describe('PUT: /expense/:id', () => {
    it('should return 400 if expense ID is invalid', async () => {
      const response = await request(app).patch('/abc').send({ status: 'disable' });

     

    it("should return expense with cached balances when status is expired or limit-reached", async () => {
      const expenseWithBalances = {
        ...mockExpense,
        status: "expired",
        data: {
          ...JSON.parse(mockExpense.data as string),
          balances: { 0: "5", 1: "50" },
        },
      };

      vi.spyOn(prisma.team, "findFirst").mockResolvedValue(mockTeam);
      vi.spyOn(prisma.expense, "findMany").mockResolvedValue([
        expenseWithBalances,
      ]);

      const response = await request(app).get("/").query({ teamId: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          ...expenseWithBalances,
          balances: { 0: "5", 1: "50" },
        },
      ]);
 expect(response.body.message).toBe(
        "Invalid path parameters - id: Must be a number"
      );
    });

    it('should return 400 if status is missing', async () => {
      const response = await request(app).patch('/1').send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(


    it("should update expense data when limit is reached", async () => {
      const expenseData = JSON.parse(mockExpense.data as string);
      expenseData.expiry = new Date().getTime() / 1000 - 3600; // Expired 1 hour ago

      vi.spyOn(prisma.team, "findFirst").mockResolvedValue(mockTeam);
      vi.spyOn(prisma.expense, "findMany").mockResolvedValue([
        { ...mockExpense, data: expenseData },
      ]);
      vi.spyOn(prisma.teamContract, "findFirst").mockResolvedValue({
        id: 1,
        teamId: 1,
        address: "0x1234567890123456789012345678901234567890",
        type: "ExpenseAccountEIP712",
        deployer: "0x1234567890123456789012345678901234567890",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.spyOn(publicClient, "readContract").mockResolvedValue([5n, 100n, 1]);
      vi.spyOn(prisma.expense, "update").mockResolvedValue(mockExpense);

      const response = await request(app).get("/").query({ teamId: 1 });

      expect(response.status).toBe(200);
      expect(prisma.expense.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: "expired",
          data: expect.objectContaining({
            balances: expect.any(Object),
          }),
        },
      });
      expect(response.body.message).toBe(
        'Invalid request body - status: Invalid status. Allowed values: disable, expired, limitReached'
      );
    });

    it('should return 400 if status is invalid', async () => {
      const response = await request(app).patch('/1').send({ status: 'invalidStatus' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid request body');
    });

    it('should return 403 if caller is not the owner of the team and the status is disable', async () => {
      vi.spyOn(prisma.expense, 'findUnique').mockResolvedValue(null);

      const response = await request(app).patch('/1').send({ status: 'disable' });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Caller is not the owner of the team');
    });

    it('should update the expense status', async () => {
      vi.spyOn(prisma.expense, 'update').mockResolvedValue({
        ...mockExpense,
        status: 'expired',
      });

      const response = await request(app).patch('/1').send({ status: 'expired' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('expired');
    });

    it('should return 500 if there is a server error', async () => {
      vi.spyOn(prisma.expense, 'update').mockRejectedValue('Server error');

      const response = await request(app).patch('/1').send({ status: 'expired' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error has occured');
    });
  });
});
