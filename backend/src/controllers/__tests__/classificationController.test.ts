import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../../utils';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import classificationRoutes from '../../routes/classificationRoute';
import { authorizeUser } from '../../middleware/authMiddleware';

const CALLER_ADDRESS = '0x1234567890123456789012345678901234567890';
const OTHER_ADDRESS = '0x9876543210987654321098765432109876543210';
const TX_ID = `0x${'a'.repeat(64)}-3`;

// Mock the authorizeUser middleware — the caller is always CALLER_ADDRESS.
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
      transactionClassification: {
        findMany: vi.fn(),
        upsert: vi.fn(),
        delete: vi.fn(),
      },
      team: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
    },
  };
});

const app = express();
app.use(express.json());
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
});
app.use('/', limiter, authorizeUser, classificationRoutes);

const mockClassification = {
  id: 1,
  teamId: 1,
  txId: TX_ID,
  category: 'REVENUE',
  memo: 'Client payment for March',
  classifiedByAddress: CALLER_ADDRESS,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Classification Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Owner + not-archived by default (both guards read prisma.team.findUnique).
    vi.mocked(prisma.team.findUnique).mockResolvedValue({
      ownerAddress: CALLER_ADDRESS,
      isArchived: false,
    } as never);
    // Team-member guard for reads.
    vi.mocked(prisma.team.findFirst).mockResolvedValue({ id: 1 } as never);
  });

  describe('GET /', () => {
    it('returns 400 when teamId is missing', async () => {
      const response = await request(app).get('/').query({});
      expect(response.status).toBe(400);
    });

    it('returns 403 when the caller is not a team member', async () => {
      vi.mocked(prisma.team.findFirst).mockResolvedValueOnce(null as never);
      const response = await request(app).get('/').query({ teamId: 1 });
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Caller is not a member of the team');
    });

    it('returns the team classifications, newest first', async () => {
      vi.mocked(prisma.transactionClassification.findMany).mockResolvedValueOnce([
        mockClassification,
      ] as never);

      const response = await request(app).get('/').query({ teamId: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([JSON.parse(JSON.stringify(mockClassification))]);
      expect(prisma.transactionClassification.findMany).toHaveBeenCalledWith({
        where: { teamId: 1 },
        orderBy: { updatedAt: 'desc' },
        include: { classifiedBy: { select: { name: true, address: true, imageUrl: true } } },
      });
    });

    it('returns 500 on a server error', async () => {
      vi.mocked(prisma.transactionClassification.findMany).mockRejectedValueOnce('boom' as never);
      const response = await request(app).get('/').query({ teamId: 1 });
      expect(response.status).toBe(500);
    });
  });

  describe('PUT /', () => {
    it('returns 400 when the category is missing', async () => {
      const response = await request(app).put('/').send({ teamId: 1, txId: TX_ID });
      expect(response.status).toBe(400);
    });

    it('returns 400 for an unsupported category', async () => {
      const response = await request(app)
        .put('/')
        .send({ teamId: 1, txId: TX_ID, category: 'GAMBLING' });
      expect(response.status).toBe(400);
    });

    it('returns 400 for a malformed txId', async () => {
      const response = await request(app)
        .put('/')
        .send({ teamId: 1, txId: 'not-a-transaction', category: 'REVENUE' });
      expect(response.status).toBe(400);
    });

    it('returns 403 when the caller is not the team owner', async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        ownerAddress: OTHER_ADDRESS,
        isArchived: false,
      } as never);

      const response = await request(app)
        .put('/')
        .send({ teamId: 1, txId: TX_ID, category: 'REVENUE' });

      expect(response.status).toBe(403);
      expect(prisma.transactionClassification.upsert).not.toHaveBeenCalled();
    });

    it('returns 409 when the team is archived', async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        ownerAddress: CALLER_ADDRESS,
        isArchived: true,
      } as never);

      const response = await request(app)
        .put('/')
        .send({ teamId: 1, txId: TX_ID, category: 'REVENUE' });

      expect(response.status).toBe(409);
      expect(prisma.transactionClassification.upsert).not.toHaveBeenCalled();
    });

    it('creates a classification, defaulting an absent memo to null', async () => {
      vi.mocked(prisma.transactionClassification.upsert).mockResolvedValueOnce(
        mockClassification as never
      );

      const response = await request(app)
        .put('/')
        .send({ teamId: 1, txId: TX_ID, category: 'REVENUE' });

      expect(response.status).toBe(200);
      expect(prisma.transactionClassification.upsert).toHaveBeenCalledWith({
        where: { teamId_txId: { teamId: 1, txId: TX_ID } },
        create: {
          teamId: 1,
          txId: TX_ID,
          category: 'REVENUE',
          memo: null,
          classifiedByAddress: CALLER_ADDRESS,
        },
        update: { category: 'REVENUE', memo: null, classifiedByAddress: CALLER_ADDRESS },
        include: { classifiedBy: { select: { name: true, address: true, imageUrl: true } } },
      });
    });

    it('normalizes a mixed-case txId to lowercase so it cannot duplicate', async () => {
      vi.mocked(prisma.transactionClassification.upsert).mockResolvedValueOnce(
        mockClassification as never
      );

      const response = await request(app)
        .put('/')
        .send({ teamId: 1, txId: `0x${'A'.repeat(64)}-3`, category: 'EXPENSE', memo: '  spend  ' });

      expect(response.status).toBe(200);
      const call = vi.mocked(prisma.transactionClassification.upsert).mock.calls[0][0];
      expect(call.where.teamId_txId.txId).toBe(`0x${'a'.repeat(64)}-3`);
      expect(call.create.memo).toBe('spend');
    });

    it('updates in place on a duplicate call (no duplicate row) — last write wins', async () => {
      vi.mocked(prisma.transactionClassification.upsert)
        .mockResolvedValueOnce({ ...mockClassification, category: 'REVENUE' } as never)
        .mockResolvedValueOnce({ ...mockClassification, category: 'OWNER_CAPITAL' } as never);

      const first = await request(app)
        .put('/')
        .send({ teamId: 1, txId: TX_ID, category: 'REVENUE' });
      const second = await request(app)
        .put('/')
        .send({ teamId: 1, txId: TX_ID, category: 'OWNER_CAPITAL' });

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(prisma.transactionClassification.upsert).toHaveBeenCalledTimes(2);
      // Both target the same (teamId, txId) key; the last call carries the winner.
      const lastCall = vi.mocked(prisma.transactionClassification.upsert).mock.calls[1][0];
      expect(lastCall.where).toEqual({ teamId_txId: { teamId: 1, txId: TX_ID } });
      expect(lastCall.update.category).toBe('OWNER_CAPITAL');
    });

    it('returns 500 on a server error', async () => {
      vi.mocked(prisma.transactionClassification.upsert).mockRejectedValueOnce('boom' as never);
      const response = await request(app)
        .put('/')
        .send({ teamId: 1, txId: TX_ID, category: 'REVENUE' });
      expect(response.status).toBe(500);
    });
  });

  describe('DELETE /', () => {
    it('returns 400 when txId is missing', async () => {
      const response = await request(app).delete('/').query({ teamId: 1 });
      expect(response.status).toBe(400);
    });

    it('returns 403 when the caller is not the team owner', async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        ownerAddress: OTHER_ADDRESS,
        isArchived: false,
      } as never);

      const response = await request(app).delete('/').query({ teamId: 1, txId: TX_ID });

      expect(response.status).toBe(403);
      expect(prisma.transactionClassification.delete).not.toHaveBeenCalled();
    });

    it('returns 404 for an unknown transaction', async () => {
      vi.mocked(prisma.transactionClassification.delete).mockRejectedValueOnce({
        code: 'P2025',
      } as never);

      const response = await request(app).delete('/').query({ teamId: 1, txId: TX_ID });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Classification not found');
    });

    it('removes a classification', async () => {
      vi.mocked(prisma.transactionClassification.delete).mockResolvedValueOnce(
        mockClassification as never
      );

      const response = await request(app).delete('/').query({ teamId: 1, txId: TX_ID });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
      expect(prisma.transactionClassification.delete).toHaveBeenCalledWith({
        where: { teamId_txId: { teamId: 1, txId: TX_ID } },
      });
    });

    it('returns 500 on a non-P2025 server error', async () => {
      vi.mocked(prisma.transactionClassification.delete).mockRejectedValueOnce('boom' as never);
      const response = await request(app).delete('/').query({ teamId: 1, txId: TX_ID });
      expect(response.status).toBe(500);
    });
  });
});
