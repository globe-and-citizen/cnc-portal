import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import teamRoutes from '../teamRoutes';
import contractRoutes from '../contractRoutes';
import expenseRoutes from '../expenseRoute';
import claimRoutes from '../claimRoute';
import wageRoutes from '../wageRoute';
import weeklyClaimRoutes from '../weeklyClaimRoute';
import actionRoutes from '../actionsRoute';
import electionRoutes from '../electionsRoute';

const OWNER_ADDRESS = '0x1234567890123456789012345678901234567890';
const MEMBER_ADDRESS = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

const START_DATE = Math.floor(Date.now() / 1000) + 3600;
const END_DATE = START_DATE + 3600 * 24 * 30;

vi.mock('../../middleware/authMiddleware', () => ({
  authorizeUser: vi.fn((req: Request, _res: Response, next: NextFunction) => {
    req.address = OWNER_ADDRESS;
    next();
  }),
}));

vi.mock('../../utils', async () => {
  const actual = await vi.importActual('../../utils');
  const prismaMock: Record<string, unknown> = {
    team: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    claim: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
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
    user: { findUnique: vi.fn() },
    teamMember: { findUnique: vi.fn(), createMany: vi.fn() },
    memberTeamsData: { findMany: vi.fn(), create: vi.fn() },
    teamContract: { findFirst: vi.fn() },
    expense: { create: vi.fn(), findUnique: vi.fn() },
  };
  prismaMock.$transaction = vi.fn(async (cb: (tx: unknown) => unknown) => cb(prismaMock));
  return { ...actual, prisma: prismaMock, addNotification: vi.fn() };
});

vi.mock('../../utils/viem.config', () => ({
  default: { readContract: vi.fn() },
}));

import { prisma } from '../../utils';

const mockTeamArchiveLookups = (isArchived: boolean) => {
  vi.mocked(prisma.team.findUnique).mockImplementation((args) => {
    const select = (args as { select?: { ownerAddress?: boolean; isArchived?: boolean } })?.select;
    if (select?.ownerAddress) {
      return Promise.resolve({ ownerAddress: OWNER_ADDRESS } as never);
    }
    if (select?.isArchived !== undefined) {
      return Promise.resolve({ isArchived } as never);
    }
    return Promise.resolve(null);
  });
  vi.mocked(prisma.team.findFirst).mockResolvedValue({ id: 1 } as never);
};

const mount = (router: express.Router, path = '/') => {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res, next) => {
    req.address = OWNER_ADDRESS;
    next();
  });
  app.use(path, router);
  return app;
};

describe('archived team guard on write routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /teams/:id/member', () => {
    const app = mount(teamRoutes);

    it('returns 409 for archived team', async () => {
      mockTeamArchiveLookups(true);

      const response = await request(app)
        .post('/1/member')
        .send([{ address: MEMBER_ADDRESS }]);

      expect(response.status).toBe(409);
      expect(response.body.message).toBe('Team is archived and cannot be modified');
    });

    it('passes through for non-archived team when owner', async () => {
      mockTeamArchiveLookups(false);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ address: OWNER_ADDRESS } as never);
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.teamMember.createMany).mockResolvedValue({ count: 1 } as never);
      vi.mocked(prisma.memberTeamsData.create).mockResolvedValue({} as never);

      const response = await request(app)
        .post('/1/member')
        .send([{ address: MEMBER_ADDRESS }]);

      expect(response.status).not.toBe(409);
    });
  });

  describe('DELETE /teams/:id/member/:memberAddress', () => {
    const app = mount(teamRoutes);

    it('returns 409 for archived team', async () => {
      mockTeamArchiveLookups(true);

      const response = await request(app).delete(`/1/member/${MEMBER_ADDRESS}`);

      expect(response.status).toBe(409);
    });
  });

  describe('POST /contract', () => {
    const app = mount(contractRoutes);

    it('returns 409 for archived team', async () => {
      mockTeamArchiveLookups(true);

      const response = await request(app).post('/').send({
        teamId: 1,
        contractAddress: '0x1111111111111111111111111111111111111111',
        contractType: 'Bank',
      });

      expect(response.status).toBe(409);
    });

    it('does not return 409 for non-archived team', async () => {
      mockTeamArchiveLookups(false);

      const response = await request(app).post('/').send({
        teamId: 1,
        contractAddress: '0x1111111111111111111111111111111111111111',
        contractType: 'Bank',
      });

      expect(response.status).not.toBe(409);
    });
  });

  describe('PATCH /expense/:id', () => {
    const app = mount(expenseRoutes);

    it('returns 409 for archived team', async () => {
      vi.mocked(prisma.expense.findUnique).mockResolvedValue({ teamId: 1 } as never);
      mockTeamArchiveLookups(true);

      const response = await request(app).patch('/1').send({ status: 'disable' });

      expect(response.status).toBe(409);
    });
  });

  describe('POST /expense', () => {
    const app = mount(expenseRoutes);

    it('returns 409 for archived team', async () => {
      mockTeamArchiveLookups(true);

      const response = await request(app)
        .post('/')
        .send({
          teamId: 1,
          signature: '0xsig',
          signedAgainstContractAddress: '0x2222222222222222222222222222222222222222',
          chainId: 1,
          data: {
            approvedAddress: OWNER_ADDRESS,
            amount: 150,
            frequencyType: 3,
            customFrequency: 0,
            tokenAddress: '0x1111111111111111111111111111111111111111',
            startDate: START_DATE,
            endDate: END_DATE,
          },
        });

      expect(response.status).toBe(409);
    });
  });

  describe('POST /claim', () => {
    const app = mount(claimRoutes);

    it('returns 409 for archived team', async () => {
      mockTeamArchiveLookups(true);

      const response = await request(app).post('/').send({
        teamId: 1,
        minutesWorked: 60,
        memo: 'work done',
      });

      expect(response.status).toBe(409);
    });
  });

  describe('PUT /claim/:claimId', () => {
    const app = mount(claimRoutes);

    it('returns 409 for archived team', async () => {
      vi.mocked(prisma.claim.findUnique).mockResolvedValue({
        wage: { teamId: 1 },
      } as never);
      mockTeamArchiveLookups(true);

      const response = await request(app).put('/1').send({ minutesWorked: 60, memo: 'updated' });

      expect(response.status).toBe(409);
    });
  });

  describe('DELETE /claim/:claimId', () => {
    const app = mount(claimRoutes);

    it('returns 409 for archived team', async () => {
      vi.mocked(prisma.claim.findUnique).mockResolvedValue({
        wage: { teamId: 1 },
      } as never);
      mockTeamArchiveLookups(true);

      const response = await request(app).delete('/1');

      expect(response.status).toBe(409);
    });
  });

  describe('PUT /wage/setWage', () => {
    const app = mount(wageRoutes);

    it('returns 409 for archived team', async () => {
      mockTeamArchiveLookups(true);

      const response = await request(app)
        .put('/setWage')
        .send({
          teamId: 1,
          userAddress: OWNER_ADDRESS,
          maximumHoursPerWeek: 40,
          ratePerHour: [{ type: 'cash', amount: 25 }],
        });

      expect(response.status).toBe(409);
    });
  });

  describe('PUT /wage/:wageId', () => {
    const app = mount(wageRoutes);

    it('returns 409 for archived team', async () => {
      vi.mocked(prisma.wage.findUnique).mockResolvedValue({ teamId: 1 } as never);
      mockTeamArchiveLookups(true);

      const response = await request(app).put('/1').query({ action: 'disable' });

      expect(response.status).toBe(409);
    });
  });

  describe('POST /weekly-claim/sync', () => {
    const app = mount(weeklyClaimRoutes);

    it('returns 409 for archived team', async () => {
      mockTeamArchiveLookups(true);

      const response = await request(app).post('/sync').query({ teamId: 1 });

      expect(response.status).toBe(409);
    });
  });

  describe('PUT /weekly-claim/:id', () => {
    const app = mount(weeklyClaimRoutes);

    it('returns 409 for archived team', async () => {
      vi.mocked(prisma.weeklyClaim.findUnique).mockResolvedValue({ teamId: 1 } as never);
      mockTeamArchiveLookups(true);

      const response = await request(app).put('/1').query({ action: 'withdraw' });

      expect(response.status).toBe(409);
    });
  });

  describe('PUT /contract/sync', () => {
    const app = mount(contractRoutes);

    it('returns 409 for archived team', async () => {
      mockTeamArchiveLookups(true);

      const response = await request(app).put('/sync').send({ teamId: 1 });

      expect(response.status).toBe(409);
    });
  });

  describe('POST /contract/officer', () => {
    const app = mount(contractRoutes);

    it('returns 409 for archived team', async () => {
      mockTeamArchiveLookups(true);

      const response = await request(app).post('/officer').send({
        teamId: 1,
        address: '0x1111111111111111111111111111111111111111',
      });

      expect(response.status).toBe(409);
    });
  });

  describe('POST /elections/:teamId', () => {
    const app = mount(electionRoutes);

    it('returns 409 for archived team', async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue({ isArchived: true } as never);

      const response = await request(app).post('/1').send({});

      expect(response.status).toBe(409);
    });
  });

  describe('DELETE /teams/:id on archived team', () => {
    const app = mount(teamRoutes);

    it('does not return 409 when team is archived', async () => {
      mockTeamArchiveLookups(true);
      vi.mocked(prisma.team.delete).mockResolvedValue({ id: 1 } as never);

      const response = await request(app).delete('/1');

      expect(response.status).not.toBe(409);
    });
  });

  describe('POST /actions', () => {
    const app = mount(actionRoutes);

    it('returns 409 for archived team', async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue({ isArchived: true } as never);

      const response = await request(app).post('/').send({
        teamId: 1,
        actionId: 100,
        description: 'test',
        targetAddress: MEMBER_ADDRESS,
        data: '0xabc',
      });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe('Team is archived and cannot be modified');
    });
  });

  describe('PATCH /actions/:id', () => {
    const app = mount(actionRoutes);

    it('returns 409 for archived team', async () => {
      vi.mocked(prisma.boardOfDirectorActions.findUnique).mockResolvedValue({
        teamId: 1,
      } as never);
      vi.mocked(prisma.team.findUnique).mockResolvedValue({ isArchived: true } as never);

      const response = await request(app).patch('/1');

      expect(response.status).toBe(409);
      expect(response.body.message).toBe('Team is archived and cannot be modified');
    });
  });
});
