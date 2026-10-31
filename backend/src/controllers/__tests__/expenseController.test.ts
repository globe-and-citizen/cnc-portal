import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../../utils';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { Expense, Team } from '@prisma/client';
import publicClient from '../../utils/viem.config';
import expenseRoutes from '../../routes/expenseRoute';
import { authorizeUser } from '../../middleware/authMiddleware';
import ABI from '../../artifacts/expense-account-eip712.json';
import * as viem from 'viem';

vi.mock('viem', async (importOriginal) => {
  const actual: object = await importOriginal();
  return {
    ...actual,
    recoverTypedDataAddress: vi.fn(),
  };
});

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
    getBlock: vi.fn(),
    chain: { id: 1 },
  },
}));

const app = express();
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100000 }));
app.use('/', authorizeUser, expenseRoutes);

const START_DATE = Math.floor(Date.now() / 1000) + 3600;
const END_DATE = START_DATE + 3600 * 24 * 30;

const mockExpenseData = {
  approvedAddress: '0x1234567890123456789012345678901234567890',
  amount: 150,
  frequencyType: 3,
  customFrequency: 0,
  tokenAddress: '0x1111111111111111111111111111111111111111',
  startDate: START_DATE, // 1 hour from now
  endDate: END_DATE, // 30 days from start date
};

const mockExpenseContractAddress = '0x2222222222222222222222222222222222222222';

const validCreateExpenseBody = {
  teamId: 1,
  signature: '0x1234',
  signedAgainstContractAddress: mockExpenseContractAddress,
  chainId: 1,
  data: mockExpenseData,
};

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
    vi.mocked(prisma.team.findUnique).mockResolvedValue({ isArchived: false } as never);
    vi.mocked(viem.recoverTypedDataAddress).mockResolvedValue(
      '0x1234567890123456789012345678901234567890'
    );
  });

  describe('POST: /', () => {
    it('returns 400 if required parameters are missing', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValue('0x123');
      const response = await request(app).post('/').send({ teamId: 1 });

      expect(response.status).toBe(400);

      expect(response.body.message).toContain('Invalid request body');
    });

    it('[AC-US-EXP-001-04] rejects approval creation from a non-owner', async () => {
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValueOnce(null);
      vi.spyOn(prisma.teamContract, 'findFirst').mockResolvedValueOnce({
        id: 1,
        teamId: 1,
        address: mockExpenseContractAddress,
        type: 'ExpenseAccountEIP712',
        deployer: '0x1234567890123456789012345678901234567890',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(
        '0x0000000000000000000000000000000000000001'
      );
      const response = await request(app)
        .post('/')
        .send({
          ...validCreateExpenseBody,
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Caller is not the owner of the team');
    });

    it('[AC-US-EXP-001-07] rejects an approval signed for a different Expense Account', async () => {
      vi.spyOn(prisma.teamContract, 'findFirst').mockResolvedValueOnce({
        id: 1,
        teamId: 1,
        address: mockExpenseContractAddress,
        type: 'ExpenseAccountEIP712',
        deployer: '0x1234567890123456789012345678901234567890',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .post('/')
        .send({
          ...validCreateExpenseBody,
          signedAgainstContractAddress: '0x3333333333333333333333333333333333333333',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        'signedAgainstContractAddress does not match the team current ExpenseAccountEIP712'
      );
      expect(prisma.expense.create).not.toHaveBeenCalled();
    });

    /**
     * Covers:
     * - [AC-US-EXP-001-06]
     * - [AC-US-EXP-001-09]
     */
    it('rejects an approval whose recovered signer differs from the connected owner', async () => {
      vi.spyOn(prisma.teamContract, 'findFirst').mockResolvedValueOnce({
        id: 1,
        teamId: 1,
        address: mockExpenseContractAddress,
        type: 'ExpenseAccountEIP712',
        deployer: '0x1234567890123456789012345678901234567890',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(
        '0x1234567890123456789012345678901234567890'
      );
      vi.mocked(viem.recoverTypedDataAddress).mockResolvedValueOnce(
        '0x3333333333333333333333333333333333333333'
      );

      const response = await request(app)
        .post('/')
        .send({
          ...validCreateExpenseBody,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Recovered signer does not match the caller');
      expect(prisma.expense.create).not.toHaveBeenCalled();
    });

    it('[AC-US-EXP-001-03] persists a new spending approval', async () => {
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValueOnce(mockTeam);
      vi.spyOn(prisma.teamContract, 'findFirst').mockResolvedValueOnce({
        id: 1,
        teamId: 1,
        address: mockExpenseContractAddress,
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

      const response = await request(app)
        .post('/')
        .send({
          ...validCreateExpenseBody,
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockExpense);
    });

    it('returns 500 if there is a server error', async () => {
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValueOnce(mockTeam);
      vi.spyOn(prisma.teamContract, 'findFirst').mockResolvedValueOnce({
        id: 1,
        teamId: 1,
        address: mockExpenseContractAddress,
        type: 'ExpenseAccountEIP712',
        deployer: '0x1234567890123456789012345678901234567890',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.spyOn(prisma.expense, 'create').mockRejectedValue('Server error');
      vi.spyOn(publicClient, 'readContract').mockResolvedValue(
        '0x1234567890123456789012345678901234567890'
      );

      const response = await request(app)
        .post('/')
        .send({
          ...validCreateExpenseBody,
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error has occured');
    });
  });

  describe('GET: /', () => {
    it('returns 400 if teamId is invalid', async () => {
      const response = await request(app).get('/').query({ teamId: 'abc' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid query parameters - teamId: Must be a number');
    });

    it('returns 403 if caller is not a team member', async () => {
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue(null);

      const response = await request(app).get('/').query({ teamId: 1 });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Caller is not a member of the team');
    });

    it('returns expenses for a valid team', async () => {
      vi.mocked(publicClient.getBlock).mockResolvedValue({
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
      } as never);
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue(mockTeam);
      vi.spyOn(prisma.expense, 'findMany').mockResolvedValue([
        {
          ...mockExpense,
          data: {
            ...mockExpenseData,
            signedAgainstContractAddress: mockExpenseContractAddress,
            chainId: 1,
          },
        },
      ]);
      vi.spyOn(prisma.teamContract, 'findFirst').mockResolvedValue({
        address: mockExpenseContractAddress,
      } as never);
      vi.spyOn(prisma.expense, 'update').mockResolvedValue(mockExpense);
      vi.spyOn(publicClient, 'readContract').mockResolvedValue([0n, 0n, 1]);
      // vi.spyOn(viem, 'keccak256').mockReturnValue('0xmockedHash');

      const response = await request(app).get('/').query({ teamId: 1 });

      expect(vi.mocked(publicClient.readContract)).toBeCalledWith({
        address: mockExpenseContractAddress,
        abi: ABI,
        functionName: 'isNewPeriod',
        args: [
          {
            amount: viem.parseUnits(mockExpenseData.amount.toString(), 6),
            frequencyType: mockExpenseData.frequencyType,
            customFrequency: BigInt(mockExpenseData.customFrequency),
            startDate: BigInt(mockExpenseData.startDate),
            endDate: BigInt(mockExpenseData.endDate),
            tokenAddress: mockExpenseData.tokenAddress,
            approvedAddress: mockExpenseData.approvedAddress,
          },
          '0xdfe1aec4a1b77ff33c295850060a264c2a6c628ccb530f212338801f3f08b8c5',
        ],
      });
      expect(response.status).toBe(200);
    });

    it('[AC-US-EXP-003-03] synchronizes on-chain activation changes into approval records', async () => {
      const expense = {
        ...mockExpense,
        signature: '0x1234',
        status: 'enabled',
        data: {
          ...mockExpenseData,
          signedAgainstContractAddress: mockExpenseContractAddress,
          chainId: 1,
        },
      };
      vi.mocked(prisma.team.findFirst).mockResolvedValue(mockTeam);
      vi.mocked(prisma.teamContract.findFirst).mockResolvedValue({
        address: mockExpenseContractAddress,
      } as never);
      vi.mocked(prisma.expense.findMany).mockResolvedValue([expense]);
      vi.mocked(prisma.expense.update).mockResolvedValue(expense);
      vi.mocked(publicClient.getBlock).mockResolvedValue({
        timestamp: BigInt(START_DATE + 60),
      } as never);

      for (const [state, status] of [
        [2, 'disabled'],
        [1, 'enabled'],
      ] as const) {
        vi.mocked(publicClient.readContract).mockImplementation(async ({ functionName }) => {
          if (functionName === 'getExpenseBalance') {
            return {
              lastWithdrawnDate: 0n,
              totalWithdrawn: 0n,
              lastWithdrawnPeriod: 0n,
              state,
            } as never;
          }
          return false as never;
        });

        const response = await request(app).get('/').query({ teamId: 1 });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject([{ id: expense.id, status }]);
        expect(prisma.expense.update).toHaveBeenLastCalledWith({
          where: { id: expense.id },
          data: { status },
        });
      }
    });

    it('filters expenses by status when status is provided', async () => {
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue(mockTeam);
      vi.spyOn(prisma.expense, 'findMany').mockResolvedValue([
        {
          ...mockExpense,
          status: 'signed',
          data: {
            ...mockExpenseData,
            signedAgainstContractAddress: mockExpenseContractAddress,
            chainId: 1,
          },
        },
      ]);
      vi.spyOn(prisma.teamContract, 'findFirst').mockResolvedValue({
        address: mockExpenseContractAddress,
      } as never);
      vi.spyOn(prisma.expense, 'update').mockResolvedValue(mockExpense);
      vi.spyOn(publicClient, 'readContract').mockResolvedValue([0n, 0n, 1]);
      vi.mocked(publicClient.getBlock).mockResolvedValue({
        timestamp: BigInt(START_DATE),
      } as never);

      const response = await request(app).get('/').query({ teamId: 1, status: 'enabled' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(prisma.expense.findMany).toHaveBeenCalledWith({
        where: { teamId: 1 },
        orderBy: { createdAt: 'desc' },
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

    it('[AC-US-EXP-004-14] reads an older approval from its registered contract', async () => {
      const oldContract = '0x3333333333333333333333333333333333333333';
      vi.mocked(prisma.team.findFirst).mockResolvedValue(mockTeam);
      vi.mocked(prisma.teamContract.findFirst).mockImplementation(
        async ({ where }) =>
          ({
            address: 'address' in where! ? oldContract : mockExpenseContractAddress,
          }) as never
      );
      vi.mocked(prisma.expense.findMany).mockResolvedValue([
        {
          ...mockExpense,
          id: 1,
          signature: '0x1234',
          status: 'enabled',
          data: { ...mockExpenseData, signedAgainstContractAddress: oldContract, chainId: 1 },
        },
        {
          ...mockExpense,
          id: 2,
          signature: '0x5678',
          data: {
            ...mockExpenseData,
            signedAgainstContractAddress: mockExpenseContractAddress,
            chainId: 1,
          },
        },
      ]);
      vi.mocked(publicClient.readContract).mockImplementation(async ({ address, functionName }) => {
        if (functionName === 'version') return '2.0.2' as never;
        if (functionName === 'getExpenseBalance') {
          return {
            lastWithdrawnDate: 1n,
            totalWithdrawn: address === oldContract ? 8_000_000n : 0n,
            lastWithdrawnPeriod: 0n,
            state: address === oldContract ? 2 : 1,
          } as never;
        }
        return false as never;
      });
      vi.mocked(publicClient.getBlock).mockResolvedValue({
        timestamp: BigInt(START_DATE),
      } as never);
      vi.mocked(prisma.expense.update).mockResolvedValue(mockExpense);

      const response = await request(app).get('/').query({ teamId: 1 });

      expect(response.status).toBe(200);
      expect(response.body[0]).toMatchObject({
        id: 1,
        status: 'disabled',
        sourceGeneration: 'previous',
        balances: { 1: '8' },
      });
      expect(response.body[1]).toMatchObject({
        id: 2,
        status: 'enabled',
        sourceGeneration: 'current',
        balances: { 1: '0' },
      });
      expect(publicClient.readContract).toHaveBeenCalledTimes(5);
      expect(prisma.expense.update).toHaveBeenCalledTimes(2);
      expect(
        vi
          .mocked(publicClient.readContract)
          .mock.calls.map(([call]) => call.address)
          .sort()
      ).toEqual(
        [
          oldContract,
          oldContract,
          oldContract,
          mockExpenseContractAddress,
          mockExpenseContractAddress,
        ].sort()
      );

      const disabled = await request(app).get('/').query({ teamId: 1, status: 'disabled' });
      expect(disabled.body.map((row: { id: number }) => row.id)).toEqual([1]);
    });

    it('[AC-US-EXP-004-14] exposes an old inactive record that its runtime does not enforce', async () => {
      const oldContract = '0x3333333333333333333333333333333333333333';
      vi.mocked(prisma.team.findFirst).mockResolvedValue(mockTeam);
      vi.mocked(prisma.teamContract.findFirst).mockImplementation(
        async ({ where }) =>
          ({ address: 'address' in where! ? oldContract : mockExpenseContractAddress }) as never
      );
      vi.mocked(prisma.expense.findMany).mockResolvedValue([
        {
          ...mockExpense,
          data: { ...mockExpenseData, signedAgainstContractAddress: oldContract, chainId: 1 },
        },
      ]);
      vi.mocked(publicClient.readContract).mockImplementation(async ({ functionName }) => {
        if (functionName === 'version') return '2.0.1' as never;
        if (functionName === 'getExpenseBalance') {
          return {
            lastWithdrawnDate: 0n,
            totalWithdrawn: 0n,
            lastWithdrawnPeriod: 0n,
            state: 2,
          } as never;
        }
        return false as never;
      });
      vi.mocked(publicClient.getBlock).mockResolvedValue({
        timestamp: BigInt(START_DATE),
      } as never);
      vi.mocked(prisma.expense.update).mockResolvedValue(mockExpense);

      const response = await request(app).get('/').query({ teamId: 1 });

      expect(response.body[0]).toMatchObject({
        status: 'enabled',
        sourceGeneration: 'previous',
        sourceEnforcesDisabled: false,
        deactivationRecordedButUnenforced: true,
      });
    });

    it('[AC-US-EXP-004-14] leaves missing or wrong-network signing provenance unavailable to spend', async () => {
      vi.mocked(prisma.team.findFirst).mockResolvedValue(mockTeam);
      vi.mocked(prisma.teamContract.findFirst).mockResolvedValue({
        address: mockExpenseContractAddress,
      } as never);
      vi.mocked(prisma.expense.findMany).mockResolvedValue([
        { ...mockExpense, id: 1, data: mockExpenseData },
        {
          ...mockExpense,
          id: 2,
          data: {
            ...mockExpenseData,
            signedAgainstContractAddress: mockExpenseContractAddress,
            chainId: 2,
          },
        },
      ]);

      const response = await request(app).get('/').query({ teamId: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject([
        { id: 1, status: 'unavailable', balances: null },
        { id: 2, status: 'unavailable', balances: null },
      ]);
      expect(publicClient.readContract).not.toHaveBeenCalled();
      expect(prisma.expense.update).not.toHaveBeenCalled();
    });

    it('[AC-US-EXP-004-14] rejects an older signing address absent from this team registry', async () => {
      const unregisteredContract = '0x3333333333333333333333333333333333333333';
      vi.mocked(prisma.team.findFirst).mockResolvedValue(mockTeam);
      vi.mocked(prisma.teamContract.findFirst)
        .mockResolvedValueOnce({ address: mockExpenseContractAddress } as never)
        .mockResolvedValueOnce(null);
      vi.mocked(prisma.expense.findMany).mockResolvedValue([
        {
          ...mockExpense,
          data: {
            ...mockExpenseData,
            signedAgainstContractAddress: unregisteredContract,
            chainId: 1,
          },
        },
      ]);

      const response = await request(app).get('/').query({ teamId: 1 });

      expect(response.status).toBe(200);
      expect(response.body[0]).toMatchObject({
        status: 'unavailable',
        sourceGeneration: 'unknown',
        balances: null,
      });
      expect(prisma.teamContract.findFirst).toHaveBeenLastCalledWith({
        where: {
          teamId: 1,
          type: 'ExpenseAccountEIP712',
          address: { equals: unregisteredContract, mode: 'insensitive' },
        },
      });
      expect(publicClient.readContract).not.toHaveBeenCalled();
    });

    it('returns 500 if there is a server error', async () => {
      vi.spyOn(prisma.team, 'findFirst').mockRejectedValue('Server error');

      const response = await request(app).get('/').query({ teamId: 1 });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error has occured');
    });
  });

  describe('retired PATCH /expense/:id', () => {
    describe.each([
      { actor: 'the current owner', address: mockTeam.ownerAddress },
      { actor: 'an unrelated wallet', address: '0x9999999999999999999999999999999999999999' },
    ])('requests from $actor', ({ address }) => {
      it.each(['disable', 'expired', 'limitReached'])(
        '[AC-US-EXP-003-04] rejects a direct %s status write without changing persistence',
        async (status) => {
          vi.mocked(authorizeUser).mockImplementationOnce((req, _res, next) => {
            req.address = address;
            next();
          });
          vi.mocked(prisma.expense.findUnique).mockResolvedValue(mockExpense);
          vi.mocked(prisma.expense.update).mockResolvedValue(mockExpense);

          const response = await request(app).patch('/1').send({ status });

          expect(response.status).toBe(404);
          expect(prisma.expense.findUnique).not.toHaveBeenCalled();
          expect(prisma.expense.update).not.toHaveBeenCalled();
          expect(publicClient.readContract).not.toHaveBeenCalled();
        }
      );
    });

    it.each([
      {
        requested: 'expired',
        stored: 'expired',
        state: 1,
        withdrawn: 2_000_000n,
        expired: false,
        expected: 'enabled',
      },
      {
        requested: 'limitReached',
        stored: 'limitReached',
        state: 1,
        withdrawn: 2_000_000n,
        expired: false,
        expected: 'enabled',
      },
      {
        requested: 'disable',
        stored: 'disable',
        state: 2,
        withdrawn: 2_000_000n,
        expired: false,
        expected: 'disabled',
      },
      {
        requested: 'expired',
        stored: 'enabled',
        state: 1,
        withdrawn: 2_000_000n,
        expired: true,
        expected: 'expired',
      },
      {
        requested: 'limitReached',
        stored: 'enabled',
        state: 1,
        withdrawn: 150_000_000n,
        expired: false,
        expected: 'limit-reached',
      },
    ])(
      '[AC-US-EXP-004-06] reads $expected from chain state after rejecting $requested with stored $stored',
      async ({ requested, stored, state, withdrawn, expired, expected }) => {
        const expense = {
          ...mockExpense,
          signature: '0x1234',
          status: stored,
          data: {
            ...mockExpenseData,
            signedAgainstContractAddress: mockExpenseContractAddress,
            chainId: 1,
          },
        };
        vi.mocked(prisma.expense.findUnique).mockResolvedValue(expense);
        vi.mocked(prisma.expense.update).mockResolvedValue(expense);

        const rejected = await request(app).patch('/1').send({ status: requested });

        expect(rejected.status).toBe(404);
        expect(prisma.expense.update).not.toHaveBeenCalled();

        vi.mocked(prisma.team.findFirst).mockResolvedValue(mockTeam);
        vi.mocked(prisma.teamContract.findFirst).mockResolvedValue({
          address: mockExpenseContractAddress,
        } as never);
        vi.mocked(prisma.expense.findMany).mockResolvedValue([expense]);
        vi.mocked(publicClient.readContract).mockImplementation(async ({ functionName }) => {
          if (functionName === 'getExpenseBalance') {
            return {
              lastWithdrawnDate: BigInt(START_DATE),
              totalWithdrawn: withdrawn,
              lastWithdrawnPeriod: 0n,
              state,
            } as never;
          }
          return false as never;
        });
        vi.mocked(publicClient.getBlock).mockResolvedValue({
          timestamp: BigInt(expired ? END_DATE + 1 : START_DATE + 60),
        } as never);

        const readback = await request(app).get('/').query({ teamId: 1 });

        expect(readback.status).toBe(200);
        expect(readback.body).toMatchObject([
          {
            id: expense.id,
            status: expected,
            sourceGeneration: 'current',
            balances: { 1: String(Number(withdrawn) / 1e6) },
          },
        ]);
        expect(publicClient.readContract).toHaveBeenCalledWith(
          expect.objectContaining({
            address: mockExpenseContractAddress,
            functionName: 'getExpenseBalance',
            args: [viem.keccak256(expense.signature as `0x${string}`)],
          })
        );
        expect(publicClient.getBlock).toHaveBeenCalledOnce();
        expect(prisma.expense.update).toHaveBeenCalledExactlyOnceWith({
          where: { id: expense.id },
          data: expect.objectContaining({ status: expected }),
        });
      }
    );
  });
});
