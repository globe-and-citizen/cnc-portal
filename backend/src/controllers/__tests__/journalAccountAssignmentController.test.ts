import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../../utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import journalAccountAssignmentRoutes from '../../routes/journalAccountAssignmentRoute';
import { authorizeUser } from '../../middleware/authMiddleware';

const CALLER_ADDRESS = '0x1234567890123456789012345678901234567890';
const OTHER_ADDRESS = '0x9876543210987654321098765432109876543210';
const JOURNAL_ENTRY_ID = `0x${'a'.repeat(64)}`;

vi.mock('../../middleware/authMiddleware', () => ({
  authorizeUser: vi.fn((req: Request, res: Response, next: NextFunction) => {
    req.address = CALLER_ADDRESS;
    next();
  }),
}));

vi.mock('../../utils', async () => {
  const actual = await vi.importActual('../../utils');
  return {
    ...actual,
    prisma: {
      journalAccountAssignment: {
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
app.use(
  '/',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }),
  authorizeUser,
  journalAccountAssignmentRoutes
);

const mockAssignment = {
  id: 1,
  teamId: 1,
  journalEntryId: JOURNAL_ENTRY_ID,
  accountId: 'interest-expense',
  memo: 'Loan interest',
  assignedByAddress: CALLER_ADDRESS,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('JournalAccountAssignment Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.team.findUnique).mockResolvedValue({
      ownerAddress: CALLER_ADDRESS,
      isArchived: false,
    } as never);
    vi.mocked(prisma.team.findFirst).mockResolvedValue({ id: 1 } as never);
  });

  describe('GET /', () => {
    it('returns 400 when teamId is missing', async () => {
      expect((await request(app).get('/')).status).toBe(400);
    });

    it('returns 403 when the caller is not a team member', async () => {
      vi.mocked(prisma.team.findFirst).mockResolvedValueOnce(null as never);
      const response = await request(app).get('/').query({ teamId: 1 });
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Caller is not a member of the team');
    });

    it('returns the team assignments newest first', async () => {
      vi.mocked(prisma.journalAccountAssignment.findMany).mockResolvedValueOnce([
        mockAssignment,
      ] as never);

      const response = await request(app).get('/').query({ teamId: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([JSON.parse(JSON.stringify(mockAssignment))]);
      expect(prisma.journalAccountAssignment.findMany).toHaveBeenCalledWith({
        where: { teamId: 1 },
        orderBy: { updatedAt: 'desc' },
        include: { assignedBy: { select: { name: true, address: true, imageUrl: true } } },
      });
    });

    it('returns 500 on a server error', async () => {
      vi.mocked(prisma.journalAccountAssignment.findMany).mockRejectedValueOnce('boom' as never);
      expect((await request(app).get('/').query({ teamId: 1 })).status).toBe(500);
    });
  });

  describe('PUT /', () => {
    it('rejects a missing or unsupported account', async () => {
      expect(
        (await request(app).put('/').send({ teamId: 1, journalEntryId: JOURNAL_ENTRY_ID })).status
      ).toBe(400);
      expect(
        (
          await request(app).put('/').send({
            teamId: 1,
            journalEntryId: JOURNAL_ENTRY_ID,
            accountId: 'cash-bank',
          })
        ).status
      ).toBe(400);
    });

    it('rejects a log id because assignments key the complete JournalEntry hash', async () => {
      const response = await request(app)
        .put('/')
        .send({
          teamId: 1,
          journalEntryId: `${JOURNAL_ENTRY_ID}-3`,
          accountId: 'operating-expense',
        });
      expect(response.status).toBe(400);
    });

    it('returns 403 when the caller is not the team owner', async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        ownerAddress: OTHER_ADDRESS,
        isArchived: false,
      } as never);

      const response = await request(app).put('/').send({
        teamId: 1,
        journalEntryId: JOURNAL_ENTRY_ID,
        accountId: 'operating-expense',
      });

      expect(response.status).toBe(403);
      expect(prisma.journalAccountAssignment.upsert).not.toHaveBeenCalled();
    });

    it('returns 409 when the team is archived', async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        ownerAddress: CALLER_ADDRESS,
        isArchived: true,
      } as never);

      const response = await request(app).put('/').send({
        teamId: 1,
        journalEntryId: JOURNAL_ENTRY_ID,
        accountId: 'operating-expense',
      });

      expect(response.status).toBe(409);
      expect(prisma.journalAccountAssignment.upsert).not.toHaveBeenCalled();
    });

    it('upserts an account assignment and defaults an absent memo to null', async () => {
      vi.mocked(prisma.journalAccountAssignment.upsert).mockResolvedValueOnce(
        mockAssignment as never
      );

      const response = await request(app).put('/').send({
        teamId: 1,
        journalEntryId: JOURNAL_ENTRY_ID,
        accountId: 'interest-expense',
      });

      expect(response.status).toBe(200);
      expect(prisma.journalAccountAssignment.upsert).toHaveBeenCalledWith({
        where: { teamId_journalEntryId: { teamId: 1, journalEntryId: JOURNAL_ENTRY_ID } },
        create: {
          teamId: 1,
          journalEntryId: JOURNAL_ENTRY_ID,
          accountId: 'interest-expense',
          memo: null,
          assignedByAddress: CALLER_ADDRESS,
        },
        update: {
          accountId: 'interest-expense',
          memo: null,
          assignedByAddress: CALLER_ADDRESS,
        },
        include: { assignedBy: { select: { name: true, address: true, imageUrl: true } } },
      });
    });

    it('normalizes a mixed-case hash and trims its memo', async () => {
      vi.mocked(prisma.journalAccountAssignment.upsert).mockResolvedValueOnce(
        mockAssignment as never
      );

      const response = await request(app)
        .put('/')
        .send({
          teamId: 1,
          journalEntryId: `0x${'A'.repeat(64)}`,
          accountId: 'payroll-expense',
          memo: '  September payroll  ',
        });

      expect(response.status).toBe(200);
      const call = vi.mocked(prisma.journalAccountAssignment.upsert).mock.calls[0][0];
      expect(call.where.teamId_journalEntryId.journalEntryId).toBe(JOURNAL_ENTRY_ID);
      expect(call.create.memo).toBe('September payroll');
    });

    it('returns 500 on a server error', async () => {
      vi.mocked(prisma.journalAccountAssignment.upsert).mockRejectedValueOnce('boom' as never);
      const response = await request(app).put('/').send({
        teamId: 1,
        journalEntryId: JOURNAL_ENTRY_ID,
        accountId: 'operating-expense',
      });
      expect(response.status).toBe(500);
    });
  });

  describe('DELETE /', () => {
    it('returns 400 when journalEntryId is missing', async () => {
      expect((await request(app).delete('/').query({ teamId: 1 })).status).toBe(400);
    });

    it('returns 403 when the caller is not the team owner', async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue({
        ownerAddress: OTHER_ADDRESS,
        isArchived: false,
      } as never);

      const response = await request(app)
        .delete('/')
        .query({ teamId: 1, journalEntryId: JOURNAL_ENTRY_ID });

      expect(response.status).toBe(403);
      expect(prisma.journalAccountAssignment.delete).not.toHaveBeenCalled();
    });

    it('returns 404 for an unknown JournalEntry', async () => {
      vi.mocked(prisma.journalAccountAssignment.delete).mockRejectedValueOnce({
        code: 'P2025',
      } as never);

      const response = await request(app)
        .delete('/')
        .query({ teamId: 1, journalEntryId: JOURNAL_ENTRY_ID });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Journal account assignment not found');
    });

    it('removes the assignment by team and JournalEntry identity', async () => {
      vi.mocked(prisma.journalAccountAssignment.delete).mockResolvedValueOnce(
        mockAssignment as never
      );

      const response = await request(app)
        .delete('/')
        .query({ teamId: 1, journalEntryId: JOURNAL_ENTRY_ID });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
      expect(prisma.journalAccountAssignment.delete).toHaveBeenCalledWith({
        where: { teamId_journalEntryId: { teamId: 1, journalEntryId: JOURNAL_ENTRY_ID } },
      });
    });
  });
});
