import { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { rejectIfArchived } from '../teamAuthzMiddleware';
import { prisma } from '../../utils';

vi.mock('../../utils', async () => {
  const actual = await vi.importActual('../../utils');
  return {
    ...actual,
    prisma: {
      team: {
        findUnique: vi.fn(),
      },
      claim: {
        findUnique: vi.fn(),
      },
      wage: {
        findUnique: vi.fn(),
      },
      boardOfDirectorActions: {
        findUnique: vi.fn(),
      },
      weeklyClaim: {
        findUnique: vi.fn(),
      },
      expense: {
        findUnique: vi.fn(),
      },
    },
  };
});

describe('rejectIfArchived', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = { body: {}, query: {}, params: {} };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  it('returns 409 when team is archived (body.teamId)', async () => {
    mockReq.body = { teamId: 1 };
    vi.mocked(prisma.team.findUnique).mockResolvedValue({ isArchived: true } as never);

    await rejectIfArchived('body.teamId')(
      mockReq as Request,
      mockRes as Response,
      mockNext as NextFunction
    );

    expect(mockRes.status).toHaveBeenCalledWith(409);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Team is archived and cannot be modified',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('calls next when team is not archived', async () => {
    mockReq.body = { teamId: 1 };
    vi.mocked(prisma.team.findUnique).mockResolvedValue({ isArchived: false } as never);

    await rejectIfArchived('body.teamId')(
      mockReq as Request,
      mockRes as Response,
      mockNext as NextFunction
    );

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('returns 404 when team is not found', async () => {
    mockReq.body = { teamId: 99 };
    vi.mocked(prisma.team.findUnique).mockResolvedValue(null);

    await rejectIfArchived('body.teamId')(
      mockReq as Request,
      mockRes as Response,
      mockNext as NextFunction
    );

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Team not found' });
  });

  it('resolves teamId from params.claimId', async () => {
    mockReq.params = { claimId: '5' };
    vi.mocked(prisma.claim.findUnique).mockResolvedValue({
      wage: { teamId: 2 },
    } as never);
    vi.mocked(prisma.team.findUnique).mockResolvedValue({ isArchived: true } as never);

    await rejectIfArchived('params.claimId')(
      mockReq as Request,
      mockRes as Response,
      mockNext as NextFunction
    );

    expect(prisma.claim.findUnique).toHaveBeenCalledWith({
      where: { id: 5 },
      select: { wage: { select: { teamId: true } } },
    });
    expect(prisma.team.findUnique).toHaveBeenCalledWith({
      where: { id: 2 },
      select: { isArchived: true },
    });
    expect(mockRes.status).toHaveBeenCalledWith(409);
  });

  it('resolves teamId from params.expenseId', async () => {
    mockReq.params = { id: '12' };
    vi.mocked(prisma.expense.findUnique).mockResolvedValue({ teamId: 3 } as never);
    vi.mocked(prisma.team.findUnique).mockResolvedValue({ isArchived: true } as never);

    await rejectIfArchived('params.expenseId')(
      mockReq as Request,
      mockRes as Response,
      mockNext as NextFunction
    );

    expect(prisma.expense.findUnique).toHaveBeenCalledWith({
      where: { id: 12 },
      select: { teamId: true },
    });
    expect(mockRes.status).toHaveBeenCalledWith(409);
  });
});
