import { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { rejectIfArchived, requireTeamMember } from '../teamAuthzMiddleware';
import { prisma } from '../../utils';

vi.mock('../../utils', async () => {
  const actual = await vi.importActual('../../utils');
  return {
    ...actual,
    prisma: {
      team: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
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

describe('requireTeamMember', () => {
  const CALLER = '0x1234567890123456789012345678901234567890';

  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = { body: {}, query: {}, params: {}, address: CALLER } as Partial<Request>;
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  it('calls next when the caller is a member (query.teamId)', async () => {
    mockReq.query = { teamId: '1' };
    vi.mocked(prisma.team.findFirst).mockResolvedValue({ id: 1 } as never);

    await requireTeamMember('query.teamId')(
      mockReq as Request,
      mockRes as Response,
      mockNext as NextFunction
    );

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  // The weekly-claim route labels the location `params.weeklyClaimId` while the
  // path parameter is `:id`, so the guard has to resolve the team through the
  // claim row rather than reading a teamId straight off the request (#2471).
  it('resolves teamId from params.weeklyClaimId and rejects a non-member', async () => {
    mockReq.params = { id: '7' };
    vi.mocked(prisma.weeklyClaim.findUnique).mockResolvedValue({ teamId: 4 } as never);
    vi.mocked(prisma.team.findFirst).mockResolvedValue(null as never);

    await requireTeamMember('params.weeklyClaimId')(
      mockReq as Request,
      mockRes as Response,
      mockNext as NextFunction
    );

    expect(prisma.weeklyClaim.findUnique).toHaveBeenCalledWith({
      where: { id: 7 },
      select: { teamId: true },
    });
    expect(prisma.team.findFirst).toHaveBeenCalledWith({
      where: { id: 4, members: { some: { address: CALLER } } },
      select: { id: true },
    });
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Caller is not a member of the team' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 400 when the weekly claim does not exist', async () => {
    mockReq.params = { id: '7' };
    vi.mocked(prisma.weeklyClaim.findUnique).mockResolvedValue(null as never);

    await requireTeamMember('params.weeklyClaimId')(
      mockReq as Request,
      mockRes as Response,
      mockNext as NextFunction
    );

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('resolves the team only once when chained with rejectIfArchived', async () => {
    mockReq.params = { id: '7' };
    vi.mocked(prisma.weeklyClaim.findUnique).mockResolvedValue({ teamId: 4 } as never);
    vi.mocked(prisma.team.findFirst).mockResolvedValue({ id: 4 } as never);
    vi.mocked(prisma.team.findUnique).mockResolvedValue({ isArchived: false } as never);

    await requireTeamMember('params.weeklyClaimId')(
      mockReq as Request,
      mockRes as Response,
      mockNext as NextFunction
    );
    await rejectIfArchived('params.weeklyClaimId')(
      mockReq as Request,
      mockRes as Response,
      mockNext as NextFunction
    );

    expect(mockNext).toHaveBeenCalledTimes(2);
    expect(prisma.weeklyClaim.findUnique).toHaveBeenCalledTimes(1);
  });
});
