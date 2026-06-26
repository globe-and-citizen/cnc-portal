import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
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
        create: vi.fn(),
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
app.use('/', authorizeUser, fixedReturnOfferingRoutes);

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

describe('FixedReturnOffering Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.team.findUnique).mockResolvedValue({ isArchived: false } as never);
    vi.mocked(prisma.team.findFirst).mockResolvedValue({ id: 1 } as never);
  });

  describe('POST: /', () => {
    it('should return 400 if required fields are missing', async () => {
      const response = await request(app).post('/').send({ teamId: 1 });

      expect(response.status).toBe(400);
    });

    it('should return 404 if the team has no FixedReturn contract', async () => {
      vi.spyOn(prisma.teamContract, 'findFirst').mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/')
        .send({ teamId: 1, offerId: 2, title: 'Riverside Expansion Note' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('FixedReturn contract not found for this team');
    });

    it('should return 403 if the caller is not the on-chain owner', async () => {
      vi.spyOn(prisma.teamContract, 'findFirst').mockResolvedValueOnce(mockTeamContract);
      vi.spyOn(publicClient, 'readContract').mockResolvedValueOnce(
        '0x0000000000000000000000000000000000000000'
      );

      const response = await request(app)
        .post('/')
        .send({ teamId: 1, offerId: 2, title: 'Riverside Expansion Note' });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Caller is not the owner of the FixedReturn contract');
    });

    it('should create offering metadata', async () => {
      vi.spyOn(prisma.teamContract, 'findFirst').mockResolvedValueOnce(mockTeamContract);
      vi.spyOn(publicClient, 'readContract').mockResolvedValueOnce(CALLER_ADDRESS);
      vi.spyOn(prisma.fixedReturnOffering, 'create').mockResolvedValueOnce(mockOffering);

      const response = await request(app).post('/').send({
        teamId: 1,
        offerId: 2,
        title: 'Riverside Expansion Note',
        purpose: 'Working capital for Q3',
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(JSON.parse(JSON.stringify(mockOffering)));
      expect(prisma.fixedReturnOffering.create).toHaveBeenCalledWith({
        data: {
          teamId: 1,
          offerId: 2,
          title: 'Riverside Expansion Note',
          purpose: 'Working capital for Q3',
        },
      });
    });

    it('should return 500 if there is a server error', async () => {
      vi.spyOn(prisma.teamContract, 'findFirst').mockResolvedValueOnce(mockTeamContract);
      vi.spyOn(publicClient, 'readContract').mockResolvedValueOnce(CALLER_ADDRESS);
      vi.spyOn(prisma.fixedReturnOffering, 'create').mockRejectedValueOnce('Server error');

      const response = await request(app)
        .post('/')
        .send({ teamId: 1, offerId: 2, title: 'Riverside Expansion Note' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error has occured');
    });
  });

  describe('GET: /', () => {
    it('should return 400 if teamId is missing', async () => {
      const response = await request(app).get('/').query({});

      expect(response.status).toBe(400);
    });

    it('should return 403 if the caller is not a team member', async () => {
      vi.mocked(prisma.team.findFirst).mockResolvedValueOnce(null);

      const response = await request(app).get('/').query({ teamId: 1 });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Caller is not a member of the team');
    });

    it('should return all offerings for a team', async () => {
      vi.spyOn(prisma.fixedReturnOffering, 'findMany').mockResolvedValueOnce([mockOffering]);

      const response = await request(app).get('/').query({ teamId: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([JSON.parse(JSON.stringify(mockOffering))]);
      expect(prisma.fixedReturnOffering.findMany).toHaveBeenCalledWith({
        where: { teamId: 1 },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by offerId when provided', async () => {
      vi.spyOn(prisma.fixedReturnOffering, 'findMany').mockResolvedValueOnce([mockOffering]);

      const response = await request(app).get('/').query({ teamId: 1, offerId: 2 });

      expect(response.status).toBe(200);
      expect(prisma.fixedReturnOffering.findMany).toHaveBeenCalledWith({
        where: { teamId: 1, offerId: 2 },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return 500 if there is a server error', async () => {
      vi.spyOn(prisma.fixedReturnOffering, 'findMany').mockRejectedValueOnce('Server error');

      const response = await request(app).get('/').query({ teamId: 1 });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error has occured');
    });
  });
});
