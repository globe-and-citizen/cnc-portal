import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { prisma } from '../../utils';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { WeeklyClaim } from '@prisma/client';
import { isCashRemunerationOwner } from '../../utils/cashRemunerationUtil';
import weeklyClaimRoutes from '../../routes/weeklyClaimRoute';
import { authorizeUser } from '../../middleware/authMiddleware';

// Mock the authorizeUser middleware
vi.mock('../../middleware/authMiddleware', () => ({
  authorizeUser: vi.fn((req: Request, res: Response, next: NextFunction) => {
    (req as any).address = '0x1234567890123456789012345678901234567890';
    next();
  }),
}));

// Mock cashRemunerationUtil
vi.mock('../../utils/cashRemunerationUtil', () => ({
  isCashRemunerationOwner: vi.fn().mockResolvedValue(true),
}));

// Mock prisma
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
      wage: {
        findUnique: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  };
});

const app = express();
app.use(express.json());
app.use('/', weeklyClaimRoutes);

function mockWage(ownerAddress = '0x1234567890123456789012345678901234567890') {
  return { team: { ownerAddress } };
}

function mockWeeklyClaim({
  id = 1,
  status = 'pending',
  weekStart = new Date('2024-07-22'),
  memberAddress = '0x1111111111111111111111111111111111111111',
  teamId = 1,
  data = {},
  signature = null,
  wageId = 1,
  createdAt = new Date('2024-07-22'),
  updatedAt = new Date('2024-07-22'),
  wage = mockWage(),
} = {}) {
  return {
    id,
    status,
    weekStart,
    memberAddress,
    teamId,
    data,
    signature,
    wageId,
    createdAt,
    updatedAt,
    wage,
  };
}

describe('Weekly Claim Controller', () => {
  describe('PUT: /:id', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return 200 if weekly claim is updated successfully', async () => {
      vi.spyOn(prisma.weeklyClaim, 'findUnique').mockResolvedValue(
        mockWeeklyClaim({
          id: 1,
          status: 'pending',
          weekStart: new Date('2024-07-22'),
          wage: mockWage('0x123'),
        })
      );
      vi.spyOn(prisma, '$transaction').mockResolvedValue([
        mockWeeklyClaim({
          id: 1,
          status: 'signed',
          signature: '0xabc' as any,
          wage: mockWage('0x123'),
        }),
      ]);

      const response = await request(app)
        .put('/1?action=sign')
        .set('address', '0x123')
        .send({ signature: '0xabc' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'signed');
    });

    it('should return 400 if action is invalid', async () => {
      const response = await request(app).put('/1?action=invalid');
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: 'Invalid action. Allowed actions are: sign, withdraw',
      });
    });

    it('should return 404 if weekly claim is not found', async () => {
      vi.spyOn(prisma.weeklyClaim, 'findUnique').mockResolvedValue(null);
      const response = await request(app)
        .put('/1?action=sign')
        .set('address', '0x123')
        .send({ signature: '0xabc' });
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'WeeklyClaim not found' });
    });

    it('should return 400 if id is invalid', async () => {
      const response = await request(app).put('/invalidId?action=sign');
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: 'Missing or invalid signature; Missing or invalid id',
      });
    });

    it('should return 404 if weekly claim is not found', async () => {
      vi.spyOn(prisma.weeklyClaim, 'findUnique').mockResolvedValue(null);
      const response = await request(app)
        .put('/1?action=sign')
        .set('address', '0x123')
        .send({ signature: '0xabc' });
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'WeeklyClaim not found' });
    });

    it('it should return 400 if caller is not the Cash Remuneration owner or owner of the team', async () => {
      (isCashRemunerationOwner as any).mockResolvedValueOnce(false);

      vi.spyOn(prisma.weeklyClaim, 'findUnique').mockResolvedValue(
        mockWeeklyClaim({
          id: 1,
          status: 'pending',
          weekStart: new Date('2024-07-22'),
          wage: mockWage('0x456'),
        })
      );

      const response = await request(app)
        .put('/1?action=sign')
        .set('address', '0x456')
        .send({ signature: '0xabc' });
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: 'Caller is not the Cash Remuneration owner or the team owner',
      });
    });

    it('should return 400 if week is not yet completed', async () => {
      const now = new Date();
      vi.spyOn(prisma.weeklyClaim, 'findUnique').mockResolvedValue(
        mockWeeklyClaim({
          id: 1,
          status: 'pending',
          weekStart: now,
          data: {},
          memberAddress: '0xMemberAddress',
          teamId: 1,
          signature: null,
          wageId: 1,
          createdAt: now,
          updatedAt: now,
          wage: mockWage('0x123'),
        })
      );

      const response = await request(app)
        .put('/1?action=sign')
        .set('address', '0x123')
        .send({ signature: '0xabc' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: 'Week not yet completed',
      });
    });

    it('should return 400 if weekly claim is already signed', async () => {
      vi.spyOn(prisma.weeklyClaim, 'findUnique').mockResolvedValue(
        mockWeeklyClaim({
          id: 1,
          status: 'signed',
          weekStart: new Date('2024-07-22'),
          wage: mockWage('0x123'),
        })
      );

      const response = await request(app)
        .put('/1?action=sign')
        .set('address', '0x123')
        .send({ signature: '0xabc' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: 'Weekly claim already signed',
      });
    });

    it('should return 400 if weekly claim is already withdrawn', async () => {
      vi.spyOn(prisma.weeklyClaim, 'findUnique').mockResolvedValue(
        mockWeeklyClaim({
          id: 1,
          status: 'withdrawn',
          weekStart: new Date('2024-07-22'),
          wage: mockWage('0x123'),
        })
      );

      const response = await request(app)
        .put('/1?action=sign')
        .set('address', '0x123')
        .send({ signature: '0xabc' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: 'Weekly claim already withdrawn',
      });
    });

    it('should return 400 if weekly claim is not signed before withdrawal', async () => {
      vi.spyOn(prisma.weeklyClaim, 'findUnique').mockResolvedValue(
        mockWeeklyClaim({
          id: 1,
          status: 'pending',
          weekStart: new Date('2024-07-22'),
          wage: mockWage('0x123'),
        })
      );

      const response = await request(app).put('/1?action=withdraw').set('address', '0x123');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: 'Weekly claim must be signed before it can be withdrawn',
      });
    });

    it('should return 400 if weekly claim already withdrawn', async () => {
      vi.spyOn(prisma.weeklyClaim, 'findUnique').mockResolvedValue(
        mockWeeklyClaim({
          id: 1,
          status: 'withdrawn',
          weekStart: new Date('2024-07-22'),
          wage: mockWage('0x123'),
        })
      );

      const response = await request(app).put('/1?action=withdraw').set('address', '0x123');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: 'Weekly claim already withdrawn',
      });
    });

    it('should successfully withdraw a signed weekly claim', async () => {
      vi.spyOn(prisma.weeklyClaim, 'findUnique').mockResolvedValue(
        mockWeeklyClaim({
          id: 1,
          status: 'signed',
          weekStart: new Date('2024-07-22'),
          wage: mockWage('0x123'),
          signature: '0xprevioussignature' as any,
        })
      );

      vi.spyOn(prisma, '$transaction').mockResolvedValue([
        mockWeeklyClaim({
          id: 1,
          status: 'withdrawn',
          weekStart: new Date('2024-07-22'),
          wage: mockWage('0x123'),
          signature: '0xprevioussignature' as any,
        }),
      ]);

      const response = await request(app).put('/1?action=withdraw').set('address', '0x123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'withdrawn');
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      vi.spyOn(prisma.weeklyClaim, 'findUnique').mockRejectedValue(new Error('Database error'));

      const response = await request(app).put('/1?action=withdraw').set('address', '0x123');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: 'Internal server error has occured',
        error: expect.any(String),
      });
    });
  });

  describe('GET: /', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return 400 if teamId is missing', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: 'Missing or invalid teamId',
      });
    });

    it('should return 400 if status is invalid', async () => {
      const response = await request(app).get('/?teamId=1&status=invalid');
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: 'Invalid status. Allowed status are: sign, withdraw, pending',
      });
    });

    it('should return 200 if status is valid', async () => {
      vi.spyOn(prisma.weeklyClaim, 'findMany').mockResolvedValue([]);
      const response = await request(app).get('/?teamId=1&status=pending');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it.only('should get weekly claims for a valid teamId', async () => {
      const testDate = new Date();
      const mockWeeklyClaims: WeeklyClaim[] = [
        {
          id: 1,
          status: null,
          weekStart: testDate,
          memberAddress: '0xMemberAddress',
          teamId: 1,
          data: {},
          claims: [],
          signature: null,
          createdAt: testDate,
          updatedAt: testDate,
          wageId: 0
        },
        {
          id: 2,
          status: null,
          weekStart: testDate,
          memberAddress: '0xMemberAddress',
          teamId: 1,
          data: {},
          claims: [],
          signature: null,
          createdAt: testDate,
          updatedAt: testDate,
          wageId: 0
        },
      ];

      vi.spyOn(prisma.weeklyClaim, 'findMany').mockResolvedValue(mockWeeklyClaims);

      const response = await request(app).get('/?teamId=1');
      expect(response.status).toBe(200);

      const expectedResponse = mockWeeklyClaims.map((claim) => ({
        ...claim,
        weekStart: claim.weekStart.toISOString(),
        createdAt: claim.createdAt.toISOString(),
        updatedAt: claim.updatedAt.toISOString(),
      })).map((wc) => {
        const hoursWorked = wc.claims.reduce((sum, claim) => {
          const h = claim.hoursWorked ?? 0;
          return sum + h;
        }, 0);

        return {
          ...wc,
          hoursWorked,
        };
      });

      expect(response.body).toEqual(expectedResponse);
    });

    it('should filter weekly claims by memberAddress if provided', async () => {
      const testDate = new Date();
      const mockWeeklyClaims: WeeklyClaim[] = [
        {
          id: 1,
          weekStart: testDate,
          memberAddress: '0xAnotherAddress',
          teamId: 1,
          data: {},
          signature: null,
          createdAt: testDate,
          updatedAt: testDate,
          wageId: 0,
          status: null,
        },
      ];

      const findManySpy = vi
        .spyOn(prisma.weeklyClaim, 'findMany')
        .mockResolvedValue(mockWeeklyClaims);

      const response = await request(app).get('/?teamId=1&memberAddress=0xAnotherAddress');
      expect(response.status).toBe(200);

      const expectedResponse = mockWeeklyClaims.map((claim) => ({
        ...claim,
        weekStart: claim.weekStart.toISOString(),
        createdAt: claim.createdAt.toISOString(),
        updatedAt: claim.updatedAt.toISOString(),
        hoursWorked: claim.hoursWorked,
      })).map((wc) => {
        const hoursWorked = wc.claims.reduce((sum, claim) => {
          const h = claim.hoursWorked ?? 0;
          return sum + h;
        }, 0);

        return {
          ...wc,
          hoursWorked,
        };
      });

      expect(response.body).toEqual(expectedResponse);
    });
  });

  it('should handle errors gracefully', async () => {
    vi.spyOn(prisma.weeklyClaim, 'findMany').mockRejectedValue(new Error('Database error'));

    const response = await request(app).get('/?teamId=1');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      message: 'Internal server error has occured',
      error: expect.any(String),
    });
  });
});
