import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { describe, vi, beforeEach, it, expect } from 'vitest';
import { Address, getContract, isAddress } from 'viem';
import { prisma } from '../../utils';
import { Team } from '@prisma/client';
import { faker } from '@faker-js/faker';
import publicClient from '../../utils/viem.config';
import contractRoutes from '../../routes/contractRoutes';
import { authorizeUser } from '../../middleware/authMiddleware';

// Mock the authorizeUser middleware
vi.mock('../../middleware/authMiddleware', () => ({
  authorizeUser: vi.fn((req: Request, res: Response, next: NextFunction) => {
    req.address = '0x1234567890123456789012345678901234567890';
    next();
  }),
}));

// Mock prisma
vi.mock('../../utils', async () => {
  const actual = await vi.importActual('../../utils');
  return {
    ...actual,
    prisma: {
      team: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      teamContract: {
        createMany: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
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
// Add the auth middleware to all routes
app.use((req: Request, res: Response, next: NextFunction) => {
  req.address = '0x1234567890123456789012345678901234567890';
  next();
});

app.use('/', contractRoutes);

const mockTeam = {
  id: 1,
  name: 'TeamName',
  ownerAddress: '0x1234567890123456789012345678901234567890',
  officerAddress: '0x1111111111111111111111111111111111111111',
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as Team;

describe('contractController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PUT: /sync', () => {
    it('should return 400 if required fields are missing or invalid', async () => {
      const response = await request(app).put('/sync');
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid request body');

      const responseV2 = await request(app).put('/sync').send({ teamId: 'invalid' });

      expect(responseV2.status).toBe(400);
      expect(response.body.message).toContain('Invalid request body');
    });

    it('should return 404 if team not found', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(null);
      const response = await request(app).put('/sync').send({ teamId: 1 });
      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Team not found');
    });

    it('should return 403 if caller is not the owner of the team', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue({
        ...mockTeam,
        ownerAddress: '0x456',
      });

      const response = await request(app).put('/sync').send({ teamId: 1 });
      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Unauthorized: Caller is not the owner of the team');
    });

    it.skip('should return 400 if no contracts are created', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(mockTeam);
      // mock readContract
      vi.spyOn(publicClient, 'readContract').mockResolvedValue([]);
      // mock createMany
      vi.spyOn(prisma.teamContract, 'createMany').mockResolvedValue({
        count: 0,
      });

      const response = await request(app).put('/sync').send({ teamId: 1 });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('No new contracts Created');
    });

    it('should return 400 if no new contracts are created (all duplicates)', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(mockTeam);
      // mock readContract to return contracts from blockchain
      vi.spyOn(publicClient, 'readContract').mockResolvedValue([
        {
          contractType: 'Voting',
          contractAddress: '0xABCDEF1234567890123456789012345678901234',
        },
      ]);
      // mock createMany to return count 0 (all duplicates were skipped)
      vi.spyOn(prisma.teamContract, 'createMany').mockResolvedValue({
        count: 0,
      });

      const response = await request(app).put('/sync').send({ teamId: 1 });

      expect(prisma.team.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(publicClient.readContract).toHaveBeenCalled();
      expect(prisma.teamContract.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            teamId: 1,
            address: '0xABCDEF1234567890123456789012345678901234',
            type: 'Voting',
            deployer: '0x1234567890123456789012345678901234567890',
          }),
        ]),
        skipDuplicates: true,
      });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('No new contracts Created');
    });

    it('should return 200 when new contracts are successfully created', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(mockTeam);
      // mock readContract to return contracts from blockchain
      vi.spyOn(publicClient, 'readContract').mockResolvedValue([
        {
          contractType: 'Voting',
          contractAddress: '0xABCDEF1234567890123456789012345678901234',
        },
        {
          contractType: 'Bank',
          contractAddress: '0x9876543210987654321098765432109876543210',
        },
      ]);
      // mock createMany to return count > 0 (new contracts created)
      vi.spyOn(prisma.teamContract, 'createMany').mockResolvedValue({
        count: 2,
      });

      const response = await request(app).put('/sync').send({ teamId: 1 });

      expect(prisma.teamContract.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            teamId: 1,
            type: 'Voting',
          }),
          expect.objectContaining({
            teamId: 1,
            type: 'Bank',
          }),
        ]),
        skipDuplicates: true,
      });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ count: 2 });
    });

    it.skip('should return 200 if contracts are found', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(mockTeam);
      // mock readContract
      vi.spyOn(publicClient, 'readContract').mockResolvedValue([
        { contractType: 'Voting', contractAddress: '0x123' },
      ]);
      // mock createMany
      vi.spyOn(prisma.teamContract, 'createMany').mockResolvedValue({
        count: 1,
      });

      const response = await request(app).put('/sync').send({ teamId: 1 });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ count: 1 });
    });

    it('should return 500 if internal server error', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockRejectedValue('Server error');
      const response = await request(app).put('/sync').send({ teamId: 1 });
      expect(response.status).toBe(500);
      expect(response.body.message).toContain('Internal server error');
    });
  });

  describe('GET: /', () => {
    it.skip('should return 400 if teamId is invalid', async () => {
      const response = await request(app).get('/').query({ teamId: 'abc' });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid or missing teamId');
    });

    it('should return 404 if no contracts are found', async () => {
      vi.spyOn(prisma.teamContract, 'findMany').mockResolvedValue([]);
      const response = await request(app).get('/').query({ teamId: 1 });
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Team or contracts not found');
    });

    it('should return 200 and list contracts for a team', async () => {
      vi.spyOn(prisma.teamContract, 'findMany').mockResolvedValue([
        {
          id: 1,
          teamId: 1,
          address: '0x123',
          type: 'Voting',
          deployer: '0xOwnerAddress',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const response = await request(app).get('/').query({ teamId: 1 });
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body[0]).toHaveProperty('id');
    });

    it('should return 500 if an error occurs', async () => {
      vi.spyOn(prisma.teamContract, 'findMany').mockRejectedValue('Error');
      const response = await request(app).get('/').query({ teamId: 1 });
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error has occured');
    });
  });

  describe('POST: /', () => {
    it('should return 400 if required fields are missing', async () => {
      const response = await request(app).post('/').send({});
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid request body');
    });

    it('should return 400 if contract address is invalid', async () => {
      const response = await request(app).post('/').send({
        teamId: 1,
        contractAddress: 'invalid',
        contractType: 'Voting',
      });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid request body');
    });

    it('should return 400 if contract type is invalid', async () => {
      // mock isAddress
      // vi.spyOn()
      const response = await request(app).post('/').send({
        teamId: 1,
        contractAddress: faker.finance.ethereumAddress(),
        contractType: 'InvalidType',
      });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid request body');
    });

    it('should return 404 if team is not found', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(null);
      const response = await request(app).post('/').send({
        teamId: 1,
        contractAddress: faker.finance.ethereumAddress(),
        contractType: 'Voting',
      });
      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Team not found');
    });

    it('should return 403 if caller is not the owner of the team', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue({
        ...mockTeam,
        ownerAddress: '0x456',
      });
      const response = await request(app).post('/').send({
        teamId: 1,
        contractAddress: faker.finance.ethereumAddress(),
        contractType: 'Voting',
      });
      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Unauthorized: Caller is not the owner of the team');
    });

    it('should return 200 and create a contract successfully', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(mockTeam);
      vi.spyOn(prisma.teamContract, 'create').mockResolvedValue({
        id: 1,
        teamId: 1,
        address: '0x123',
        type: 'Voting',
        deployer: '0xOwnerAddress',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const response = await request(app).post('/').send({
        teamId: 1,
        contractAddress: faker.finance.ethereumAddress(),
        contractType: 'Voting',
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
    });

    it('should return 500 if an error occurs', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockRejectedValue('Test');
      const response = await request(app).post('/').send({
        teamId: 1,
        contractAddress: faker.finance.ethereumAddress(),
        contractType: 'Voting',
      });
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error has occured');
    });
  });
});
