import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import weeklyClaimRoutes from '../../routes/weeklyClaimRoute';
import { prisma } from '../../utils';
import { isCashRemunerationOwner } from '../../utils/cashRemunerationUtil';
import type { Address } from 'viem';

const CALLER = '0x1234567890123456789012345678901234567890';

const { mockGetPresignedDownloadUrl } = vi.hoisted(() => ({
  mockGetPresignedDownloadUrl: vi.fn(),
}));

const { readContractMock } = vi.hoisted(() => ({
  readContractMock: vi.fn(),
}));

vi.mock('../../services/storageService', () => ({
  getPresignedDownloadUrl: mockGetPresignedDownloadUrl,
}));

vi.mock('../../middleware/authMiddleware', () => ({
  authorizeUser: vi.fn(
    (req: Request & { address: Address }, _res: Response, next: NextFunction) => {
      req.address = CALLER as Address;
      next();
    }
  ),
}));

vi.mock('../../utils/cashRemunerationUtil', () => ({
  isCashRemunerationOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../utils/viem.config', () => ({
  default: { readContract: readContractMock },
}));

vi.mock('../../utils', async () => {
  const actual = await vi.importActual('../../utils');
  return {
    ...actual,
    prisma: {
      weeklyClaim: {
        findMany: vi.fn(),
        update: vi.fn(),
        findUnique: vi.fn(),
      },
      teamContract: {
        findFirst: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  };
});

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  req.address = CALLER;
  next();
});
app.use('/', weeklyClaimRoutes);

const ownerWage = (ownerAddress = CALLER) => ({ team: { id: 1, ownerAddress } });

const weeklyClaimFactory = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  status: 'pending',
  weekStart: new Date('2024-07-22'),
  memberAddress: '0x1111111111111111111111111111111111111111',
  teamId: 1,
  data: {},
  signature: null,
  wageId: 1,
  createdAt: new Date('2024-07-22'),
  updatedAt: new Date('2024-07-22'),
  wage: ownerWage(),
  ...overrides,
});

const putAction = (
  action: string,
  id = '1',
  body: Record<string, unknown> = { signature: '0xabc' }
) => request(app).put(`/${id}?action=${action}`).send(body);

describe('Weekly Claim Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isCashRemunerationOwner).mockResolvedValue(true);
  });

  describe('PUT /:id', () => {
    it.each([
      {
        title: 'enable unauthorized',
        action: 'enable',
        claim: weeklyClaimFactory({
          status: 'disabled',
          signature: '0xabc',
          wage: ownerWage('0x456'),
        }),
        ownerOk: false,
        message: 'Caller is not the Cash Remuneration owner or the team owner',
      },
      {
        title: 'enable no signature',
        action: 'enable',
        claim: weeklyClaimFactory({ status: 'pending', signature: null, wage: ownerWage('0x456') }),
        ownerOk: true,
        message: 'No claim existing signature: You need to sign claim first',
      },
      {
        title: 'enable already active',
        action: 'enable',
        claim: weeklyClaimFactory({
          status: 'signed',
          signature: '0xabc',
          data: { ownerAddress: CALLER },
        }),
        ownerOk: true,
        message: 'Weekly claim already active',
      },
      {
        title: 'enable already withdrawn',
        action: 'enable',
        claim: weeklyClaimFactory({ status: 'withdrawn', signature: '0xabc' }),
        ownerOk: true,
        message: 'Weekly claim already withdrawn',
      },
      {
        title: 'disable unauthorized',
        action: 'disable',
        claim: weeklyClaimFactory({ status: 'signed', wage: ownerWage('0x456') }),
        ownerOk: false,
        message: 'Caller is not the Cash Remuneration owner or the team owner',
      },
      {
        title: 'disable already disabled',
        action: 'disable',
        claim: weeklyClaimFactory({ status: 'disabled', data: { ownerAddress: CALLER } }),
        ownerOk: true,
        message: 'Weekly claim already disabled',
      },
      {
        title: 'disable already withdrawn',
        action: 'disable',
        claim: weeklyClaimFactory({ status: 'withdrawn' }),
        ownerOk: true,
        message: 'Weekly claim already withdrawn',
      },
      {
        title: 'sign unauthorized',
        action: 'sign',
        claim: weeklyClaimFactory({ status: 'pending', wage: ownerWage('0x456') }),
        ownerOk: false,
        message: 'Caller is not the Cash Remuneration owner or the team owner',
      },
      {
        title: 'sign week not completed',
        action: 'sign',
        claim: weeklyClaimFactory({ status: 'pending', weekStart: new Date() }),
        ownerOk: true,
        message: 'Week not yet completed',
      },
      {
        title: 'sign already signed',
        action: 'sign',
        claim: weeklyClaimFactory({ status: 'signed', data: { ownerAddress: CALLER } }),
        ownerOk: true,
        message: 'Weekly claim already signed',
      },
      {
        title: 'sign already withdrawn',
        action: 'sign',
        claim: weeklyClaimFactory({ status: 'withdrawn' }),
        ownerOk: true,
        message: 'Weekly claim already withdrawn',
      },
      {
        title: 'withdraw requires signed',
        action: 'withdraw',
        claim: weeklyClaimFactory({ status: 'pending' }),
        ownerOk: true,
        message: 'Weekly claim must be signed before it can be withdrawn',
      },
      {
        title: 'withdraw already withdrawn',
        action: 'withdraw',
        claim: weeklyClaimFactory({ status: 'withdrawn' }),
        ownerOk: true,
        message: 'Weekly claim already withdrawn',
      },
    ])('should return 400 for $title', async ({ action, claim, ownerOk, message }) => {
      vi.mocked(isCashRemunerationOwner).mockResolvedValue(ownerOk);
      vi.spyOn(prisma.weeklyClaim, 'findUnique').mockResolvedValue(claim as any);
      const response = await putAction(action);
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message });
    });

    it('should return 400 for invalid action', async () => {
      const response = await putAction('invalid');
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: 'Invalid action. Allowed actions are: sign, withdraw',
      });
    });

    it('should return 400 for invalid id on sign', async () => {
      const response = await putAction('sign', 'invalidId');
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: 'Missing or invalid id' });
    });

    it('should return 400 for missing signature on sign', async () => {
      const response = await putAction('sign', '1', {});
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: 'Missing or invalid signature' });
    });

    it('should return 404 if weekly claim is not found', async () => {
      vi.spyOn(prisma.weeklyClaim, 'findUnique').mockResolvedValue(null);
      const response = await putAction('sign');
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'WeeklyClaim not found' });
    });

    it.each([
      {
        title: 'enable success',
        action: 'enable',
        claim: weeklyClaimFactory({ status: 'disabled', signature: '0xabc' }),
        txResult: weeklyClaimFactory({ status: 'signed', signature: '0xabc' }),
        expected: 'signed',
      },
      {
        title: 'disable success',
        action: 'disable',
        claim: weeklyClaimFactory({ status: 'signed', signature: '0xabc', data: 'not-an-object' }),
        txResult: weeklyClaimFactory({ status: 'disabled', signature: '0xabc' }),
        expected: 'disabled',
      },
      {
        title: 'sign success',
        action: 'sign',
        claim: weeklyClaimFactory({ status: 'pending' }),
        txResult: weeklyClaimFactory({ status: 'signed', signature: '0xabc' }),
        expected: 'signed',
      },
      {
        title: 'withdraw success',
        action: 'withdraw',
        claim: weeklyClaimFactory({ status: 'signed', signature: '0xabc' }),
        txResult: weeklyClaimFactory({ status: 'withdrawn', signature: '0xabc' }),
        expected: 'withdrawn',
      },
    ])('should return 200 for $title', async ({ action, claim, txResult, expected }) => {
      vi.spyOn(prisma.weeklyClaim, 'findUnique').mockResolvedValue(claim as any);
      vi.spyOn(prisma, '$transaction').mockResolvedValue([txResult as any]);
      const response = await putAction(action);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', expected);
    });

    it.each([
      {
        title: 'enable with signed status and non-object data',
        action: 'enable',
        claim: weeklyClaimFactory({ status: 'signed', signature: '0xabc', data: 'not-object' }),
      },
      {
        title: 'disable with disabled status and non-object data',
        action: 'disable',
        claim: weeklyClaimFactory({ status: 'disabled', signature: '0xabc', data: 'not-object' }),
      },
      {
        title: 'sign with signed status and non-object data',
        action: 'sign',
        claim: weeklyClaimFactory({ status: 'signed', signature: '0xabc', data: 'not-object' }),
      },
      {
        title: 'sign with disabled status to skip withdrawn branch',
        action: 'sign',
        claim: weeklyClaimFactory({ status: 'disabled', signature: '0xabc', data: {} }),
      },
    ])('should keep flowing for $title', async ({ action, claim }) => {
      vi.spyOn(prisma.weeklyClaim, 'findUnique').mockResolvedValue(claim as any);
      vi.spyOn(prisma, '$transaction').mockResolvedValue([
        weeklyClaimFactory({ status: 'signed' }) as any,
      ]);
      const response = await putAction(action);
      expect(response.status).toBe(200);
    });

    it('should return 500 when update throws', async () => {
      vi.spyOn(prisma.weeklyClaim, 'findUnique').mockRejectedValue(new Error('Database error'));
      const response = await putAction('withdraw');
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: 'Internal server error has occured',
        error: expect.any(String),
      });
    });
  });

  describe('GET /', () => {
    it('should return 400 if teamId is missing', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: 'Missing or invalid teamId' });
    });

    it('should return 400 if status is invalid', async () => {
      const response = await request(app).get('/?teamId=1&status=invalid');
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: 'Invalid status. Allowed statuses are: pending, signed, withdrawn, disabled',
      });
    });

    it('should return filtered claims and refresh attachment URLs', async () => {
      mockGetPresignedDownloadUrl
        .mockResolvedValueOnce('fresh-1')
        .mockRejectedValueOnce(new Error('presign failed'));

      const weeklyClaims = [
        {
          ...weeklyClaimFactory({ id: 1, memberAddress: '0xAnotherAddress', status: null }),
          claims: [
            {
              id: 101,
              hoursWorked: undefined,
              fileAttachments: [
                { fileKey: 'k1', fileUrl: 'old', fileType: 'image/png', fileSize: 1 },
              ],
            },
            {
              id: 102,
              hoursWorked: 2,
              fileAttachments: [{ fileUrl: 'no-key', fileType: 'image/png', fileSize: 2 }],
            },
            {
              id: 103,
              hoursWorked: 3,
              fileAttachments: ['non-object'],
            },
            {
              id: 104,
              hoursWorked: 4,
              fileAttachments: [
                { fileKey: 'k2', fileUrl: 'old2', fileType: 'image/png', fileSize: 4 },
              ],
            },
            {
              id: 105,
              hoursWorked: 1,
              fileAttachments: [],
            },
          ],
        },
      ];

      vi.spyOn(prisma.weeklyClaim, 'findMany').mockResolvedValue(weeklyClaims as any);

      const response = await request(app).get(
        '/?teamId=1&status=pending&memberAddress=0xAnotherAddress'
      );
      expect(response.status).toBe(200);
      expect(prisma.weeklyClaim.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ memberAddress: '0xAnotherAddress', status: 'pending' }),
        })
      );

      expect(response.body[0].hoursWorked).toBe(10);
      expect(response.body[0].claims[0].fileAttachments[0].fileUrl).toBe('fresh-1');
      expect(response.body[0].claims[3].fileAttachments[0].fileUrl).toBe('old2');
    });

    it('should return 200 for empty claims list', async () => {
      vi.spyOn(prisma.weeklyClaim, 'findMany').mockResolvedValue([] as any);
      const response = await request(app).get('/?teamId=1&status=pending');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return 500 when list query fails', async () => {
      vi.spyOn(prisma.weeklyClaim, 'findMany').mockRejectedValue(new Error('Database error'));
      const response = await request(app).get('/?teamId=1');
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: 'Internal server error has occured',
        error: expect.any(String),
      });
    });
  });

  describe('POST /sync', () => {
    const validContract = {
      id: 11,
      teamId: 1,
      type: 'CashRemunerationEIP712',
      address: '0x1234567890123456789012345678901234567890',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return 400 if teamId is missing', async () => {
      const response = await request(app).post('/sync');
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: 'Missing or invalid teamId' });
    });

    it.each([
      { title: 'contract not found', contract: null },
      {
        title: 'invalid contract address',
        contract: { ...validContract, address: 'not-an-eth-address' },
      },
    ])('should return 404 when $title', async ({ contract }) => {
      vi.spyOn(prisma.teamContract, 'findFirst').mockResolvedValue(contract as any);
      const response = await request(app).post('/sync?teamId=1');
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: 'Cash Remuneration contract not found for the team',
      });
    });

    it('should return empty sync result when no weekly claims', async () => {
      vi.spyOn(prisma.teamContract, 'findFirst').mockResolvedValue(validContract as any);
      vi.spyOn(prisma.weeklyClaim, 'findMany').mockResolvedValue([] as any);

      const response = await request(app).post('/sync?teamId=1');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ teamId: 1, totalProcessed: 0, updated: [], skipped: [] });
    });

    it('should update status from signed to withdrawn when paid on-chain', async () => {
      vi.spyOn(prisma.teamContract, 'findFirst').mockResolvedValue(validContract as any);

      vi.spyOn(prisma.weeklyClaim, 'findMany').mockResolvedValue([
        { id: 1, status: 'signed', signature: 'not-hex' },
        { id: 2, status: 'signed', signature: '0xabcdef' },
      ] as any);

      readContractMock.mockReset();
      readContractMock.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      const updateSpy = vi.spyOn(prisma.weeklyClaim, 'update').mockResolvedValue({
        id: 2,
        status: 'withdrawn',
      } as any);

      const response = await request(app).post('/sync?teamId=1');
      expect(response.status).toBe(200);
      expect(response.body.skipped).toEqual([{ id: 1, reason: 'Missing or invalid signature' }]);
      expect(response.body.updated).toEqual([
        { id: 2, previousStatus: 'signed', newStatus: 'withdrawn' },
      ]);
      expect(updateSpy).toHaveBeenCalledWith({ where: { id: 2 }, data: { status: 'withdrawn' } });
    });

    it('should keep signed status when neither paid nor disabled', async () => {
      vi.spyOn(prisma.teamContract, 'findFirst').mockResolvedValue(validContract as any);
      vi.spyOn(prisma.weeklyClaim, 'findMany').mockResolvedValue([
        { id: 7, status: 'signed', signature: '0xfeed' },
      ] as any);

      readContractMock.mockReset();
      readContractMock.mockResolvedValueOnce(false).mockResolvedValueOnce(false);

      const response = await request(app).post('/sync?teamId=1');
      expect(response.status).toBe(200);
      expect(response.body.updated).toEqual([]);
      expect(prisma.weeklyClaim.update).not.toHaveBeenCalled();
    });

    it('should update with unknown previous status when claim.status is null', async () => {
      vi.spyOn(prisma.teamContract, 'findFirst').mockResolvedValue(validContract as any);
      vi.spyOn(prisma.weeklyClaim, 'findMany').mockResolvedValue([
        { id: 8, status: null, signature: '0xface' },
      ] as any);

      readContractMock.mockReset();
      readContractMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      vi.spyOn(prisma.weeklyClaim, 'update').mockResolvedValue({
        id: 8,
        status: 'disabled',
      } as any);

      const response = await request(app).post('/sync?teamId=1');
      expect(response.status).toBe(200);
      expect(response.body.updated).toEqual([
        { id: 8, previousStatus: 'unknown', newStatus: 'disabled' },
      ]);
    });

    it('should skip claim on readContract error', async () => {
      vi.spyOn(prisma.teamContract, 'findFirst').mockResolvedValue(validContract as any);
      vi.spyOn(prisma.weeklyClaim, 'findMany').mockResolvedValue([
        { id: 5, status: 'signed', signature: '0xdeadbeef' },
      ] as any);

      readContractMock.mockReset();
      readContractMock.mockRejectedValueOnce(new Error('RPC error'));

      const response = await request(app).post('/sync?teamId=1');
      expect(response.status).toBe(200);
      expect(response.body.updated).toEqual([]);
      expect(response.body.skipped).toEqual([{ id: 5, reason: 'Failed to read contract state' }]);
    });

    it('should return 500 when sync setup throws', async () => {
      vi.spyOn(prisma.teamContract, 'findFirst').mockResolvedValue(validContract as any);
      vi.spyOn(prisma.weeklyClaim, 'findMany').mockRejectedValue(new Error('Database failure'));

      const response = await request(app).post('/sync?teamId=1');
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: 'Internal server error has occured',
        error: 'Database failure',
      });
    });
  });
});
