import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../../utils';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { FixedReturnOffering } from '@prisma/client';
import publicClient from '../../utils/viem.config';
import fixedReturnOfferingRoutes from '../../routes/fixedReturnOfferingRoute';
import { authorizeUser } from '../../middleware/authMiddleware';

const CALLER_ADDRESS = '0x1234567890123456789012345678901234567890';
const FIXED_RETURN_ADDRESS = '0x9876543210987654321098765432109876543210';

// Mock the authorizeUser middleware
vi.mock('../../middleware/authMiddleware', () => ({
  authorizeUser: vi.fn((req: Request, res: Response, next: NextFunction) => {
    req.address = CALLER_ADDRESS;
    next();
  }),
}));

// Mock prisma
vi.mock('../../utils', async () => {
  const actual = await vi.importActual('../../utils');
  return {
    ...actual,
    prisma: {
      fixedReturnOffering: {
        upsert: vi.fn(),
        findMany: vi.fn(),
      },
      team: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
      teamContract: {
        findFirst: vi.fn(),
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
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
});
app.use('/', limiter, authorizeUser, fixedReturnOfferingRoutes);

const mockTeamContract = {
  id: 1,
  teamId: 1,
  address: FIXED_RETURN_ADDRESS,
  type: 'FixedReturn',
  deployer: CALLER_ADDRESS,
  officerId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockOffering = {
  id: 1,
  teamId: 1,
  offerId: 2,
  title: 'Riverside Expansion Note',
  purpose: 'Working capital for Q3',
  createdAt: new Date(),
  updatedAt: new Date(),
} as FixedReturnOffering;

/**
 * The controller now calls `readContract` twice per request (owner, then
 * getTotalOfferings), so a `functionName`-keyed implementation is more robust
 * than sequencing `mockResolvedValueOnce` calls in call order.
 */
const mockReadContract = (opts: { owner?: string; totalOfferings?: bigint } = {}) => {
  vi.spyOn(publicClient, 'readContract').mockImplementation((async (args: {
    functionName: string;
  }) => {
    if (args.functionName === 'owner') return opts.owner ?? CALLER_ADDRESS;
    if (args.functionName === 'getTotalOfferings') return opts.totalOfferings ?? 10n;
    throw new Error(`Unexpected functionName in test: ${args.functionName}`);
  }) as typeof publicClient.readContract);
};

describe('FixedReturnOffering Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.team.findUnique).mockResolvedValue({ isArchived: false } as never);
    vi.mocked(prisma.team.findFirst).mockResolvedValue({ id: 1 } as never);
  });

  describe('POST: /', () => {
    it('returns 400 if required fields are missing', async () => {
      const response = await request(app).post('/').send({ teamId: 1 });

      expect(response.status).toBe(400);
    });

    it('returns 404 if the team has no FixedReturn contract', async () => {
      vi.spyOn(prisma.teamContract, 'findFirst').mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/')
        .send({ teamId: 1, offerId: 2, title: 'Riverside Expansion Note' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('FixedReturn contract not found for this team');
    });

    it('[AC-US-CC-002-18] rejects metadata writes from a non-owner', async () => {
      vi.spyOn(prisma.teamContract, 'findFirst').mockResolvedValueOnce(mockTeamContract);
      mockReadContract({ owner: '0x0000000000000000000000000000000000000000' });

      const response = await request(app)
        .post('/')
        .send({ teamId: 1, offerId: 2, title: 'Riverside Expansion Note' });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Caller is not the owner of the FixedReturn contract');
    });

    it('[AC-US-CC-002-17] rejects metadata for an offer that does not exist on-chain', async () => {
      vi.spyOn(prisma.teamContract, 'findFirst').mockResolvedValueOnce(mockTeamContract);
      mockReadContract({ totalOfferings: 2n });

      const response = await request(app)
        .post('/')
        .send({ teamId: 1, offerId: 3, title: 'Riverside Expansion Note' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        'offerId 3 does not exist on this FixedReturn contract yet (2 offering(s) created so far)'
      );
      expect(prisma.fixedReturnOffering.upsert).not.toHaveBeenCalled();
    });

    it('creates offering metadata on first save', async () => {
      vi.spyOn(prisma.teamContract, 'findFirst').mockResolvedValueOnce(mockTeamContract);
      mockReadContract({ totalOfferings: 5n });
      vi.spyOn(prisma.fixedReturnOffering, 'upsert').mockResolvedValueOnce(mockOffering);

      const response = await request(app).post('/').send({
        teamId: 1,
        offerId: 2,
        title: 'Riverside Expansion Note',
        purpose: 'Working capital for Q3',
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(JSON.parse(JSON.stringify(mockOffering)));
      expect(prisma.fixedReturnOffering.upsert).toHaveBeenCalledWith({
        where: { teamId_offerId: { teamId: 1, offerId: 2 } },
        create: {
          teamId: 1,
          offerId: 2,
          title: 'Riverside Expansion Note',
          purpose: 'Working capital for Q3',
        },
        update: { title: 'Riverside Expansion Note', purpose: 'Working capital for Q3' },
      });
    });

    it('[AC-US-CC-002-16] preserves metadata on an identical retry', async () => {
      vi.spyOn(prisma.teamContract, 'findFirst').mockResolvedValue(mockTeamContract);
      mockReadContract({ totalOfferings: 5n });
      vi.spyOn(prisma.fixedReturnOffering, 'upsert').mockResolvedValue(mockOffering);

      const payload = {
        teamId: 1,
        offerId: 2,
        title: 'Riverside Expansion Note',
        purpose: 'Working capital for Q3',
      };
      const first = await request(app).post('/').send(payload);
      // The client never saw `first`'s response (timeout/dropped connection) and retries
      // with the exact same payload.
      const retry = await request(app).post('/').send(payload);

      expect(first.status).toBe(200);
      expect(retry.status).toBe(200);
      expect(prisma.fixedReturnOffering.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.fixedReturnOffering.upsert).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ where: { teamId_offerId: { teamId: 1, offerId: 2 } } })
      );
    });

    it('[AC-US-CC-002-16] overwrites metadata with the current values on retry', async () => {
      vi.spyOn(prisma.teamContract, 'findFirst').mockResolvedValueOnce(mockTeamContract);
      mockReadContract({ totalOfferings: 5n });
      const updated = {
        ...mockOffering,
        title: 'Riverside Expansion Note v2',
        purpose: 'Revised: bridge financing',
      };
      vi.spyOn(prisma.fixedReturnOffering, 'upsert').mockResolvedValueOnce(updated);

      const response = await request(app).post('/').send({
        teamId: 1,
        offerId: 2,
        title: 'Riverside Expansion Note v2',
        purpose: 'Revised: bridge financing',
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(JSON.parse(JSON.stringify(updated)));
      expect(prisma.fixedReturnOffering.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { title: 'Riverside Expansion Note v2', purpose: 'Revised: bridge financing' },
        })
      );
    });

    it('returns 500 if there is a server error', async () => {
      vi.spyOn(prisma.teamContract, 'findFirst').mockResolvedValueOnce(mockTeamContract);
      mockReadContract({ totalOfferings: 5n });
      vi.spyOn(prisma.fixedReturnOffering, 'upsert').mockRejectedValueOnce('Server error');

      const response = await request(app)
        .post('/')
        .send({ teamId: 1, offerId: 2, title: 'Riverside Expansion Note' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error has occured');
    });
  });

  describe('GET: /', () => {
    it('returns 400 if teamId is missing', async () => {
      const response = await request(app).get('/').query({});

      expect(response.status).toBe(400);
    });

    it('returns 403 if the caller is not a team member', async () => {
      vi.mocked(prisma.team.findFirst).mockResolvedValueOnce(null);

      const response = await request(app).get('/').query({ teamId: 1 });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Caller is not a member of the team');
    });

    it('returns all offerings for a team', async () => {
      vi.spyOn(prisma.fixedReturnOffering, 'findMany').mockResolvedValueOnce([mockOffering]);

      const response = await request(app).get('/').query({ teamId: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([JSON.parse(JSON.stringify(mockOffering))]);
      expect(prisma.fixedReturnOffering.findMany).toHaveBeenCalledWith({
        where: { teamId: 1 },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('filters by offerId when provided', async () => {
      vi.spyOn(prisma.fixedReturnOffering, 'findMany').mockResolvedValueOnce([mockOffering]);

      const response = await request(app).get('/').query({ teamId: 1, offerId: 2 });

      expect(response.status).toBe(200);
      expect(prisma.fixedReturnOffering.findMany).toHaveBeenCalledWith({
        where: { teamId: 1, offerId: 2 },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('returns 500 if there is a server error', async () => {
      vi.spyOn(prisma.fixedReturnOffering, 'findMany').mockRejectedValueOnce('Server error');

      const response = await request(app).get('/').query({ teamId: 1 });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error has occured');
    });
  });
});
