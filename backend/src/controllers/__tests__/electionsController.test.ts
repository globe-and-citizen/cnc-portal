import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import electionRoute from '../../routes/electionsRoute';
import { addNotification, prisma } from '../../utils';

const OWNER = '0x1234567890123456789012345678901234567890';
const TEAMMATE = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

let callerAddress = OWNER;

vi.mock('../../middleware/authMiddleware', () => ({
  authorizeUser: vi.fn((req: Request, res: Response, next: NextFunction) => {
    req.address = callerAddress;
    next();
  }),
}));

vi.mock('../../middleware/teamAuthzMiddleware', () => ({
  rejectIfArchived: vi.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
}));

vi.mock('../../utils', async () => {
  const actual = await vi.importActual('../../utils');
  return {
    ...actual,
    prisma: {
      team: {
        findUnique: vi.fn(),
      },
      $disconnect: vi.fn(),
    },
    addNotification: vi.fn(),
  };
});

/**
 * The endpoint must never touch the chain: the old board-membership check read
 * the Elections contract with the Board ABI, so any read here is a regression.
 */
vi.mock('../../utils/viem.config', () => ({
  default: {
    readContract: vi.fn(() => {
      throw new Error('readContract must not be called');
    }),
  },
}));

const app = express();
app.use(express.json());
app.use('/elections', electionRoute);

const mockTeam = {
  id: 1,
  ownerAddress: OWNER,
  members: [{ address: OWNER }, { address: TEAMMATE }],
};

describe('Elections Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callerAddress = OWNER;
  });

  describe('POST /elections/:teamId', () => {
    it('[AC-US-EL-04-01] notifies every team member when the owner calls', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(mockTeam as never);

      const response = await request(app).post('/elections/1').send({});

      expect(response.status).toBe(201);
      expect(vi.mocked(addNotification)).toHaveBeenCalledWith([OWNER, TEAMMATE], {
        message: 'New election created you are invited to participate',
        subject: 'New Election Created',
        author: OWNER,
        resource: 'elections/1',
      });
    });

    it('[AC-US-EL-04-04] refuses a teammate who is not the owner without reading the chain', async () => {
      callerAddress = TEAMMATE;
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(mockTeam as never);

      const response = await request(app).post('/elections/1').send({});

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Only the team owner can send election notifications');
      expect(vi.mocked(addNotification)).not.toHaveBeenCalled();
    });

    it('returns 404 with a correctly spelled message for an unknown team', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(null);

      const response = await request(app).post('/elections/999').send({});

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Team not found');
      expect(vi.mocked(addNotification)).not.toHaveBeenCalled();
    });

    it('returns 500 when the database fails', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockRejectedValue(new Error('db down'));

      const response = await request(app).post('/elections/1').send({});

      expect(response.status).toBe(500);
      expect(vi.mocked(addNotification)).not.toHaveBeenCalled();
    });
  });
});
