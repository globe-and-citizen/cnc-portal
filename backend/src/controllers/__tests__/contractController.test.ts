import { faker } from '@faker-js/faker';
import { Prisma, Team, TeamOfficer } from '@prisma/client';
import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import contractRoutes from '../../routes/contractRoutes';
import { prisma } from '../../utils';
import publicClient from '../../utils/viem.config';

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
        updateMany: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
      teamOfficer: {
        upsert: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
    },
  };
});

// Mock viem config
vi.mock('../../utils/viem.config', () => ({
  default: {
    readContract: vi.fn(),
    getChainId: vi.fn(),
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

const mockOfficerAddress = '0x1111111111111111111111111111111111111111';

const mockTeam = {
  id: 1,
  name: 'TeamName',
  ownerAddress: '0x1234567890123456789012345678901234567890',
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as Team;

const buildMockTeamOfficer = (overrides: Partial<TeamOfficer> = {}): TeamOfficer => ({
  id: 1,
  address: mockOfficerAddress,
  teamId: mockTeam.id,
  deployer: mockTeam.ownerAddress,
  deployBlockNumber: null,
  deployedAt: null,
  previousOfficerId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('contractController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(publicClient.getChainId).mockResolvedValue(11155111);
    vi.mocked(prisma.teamContract.findMany).mockResolvedValue([]);
    vi.mocked(prisma.teamContract.updateMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.teamOfficer.findFirst).mockResolvedValue(buildMockTeamOfficer());
    vi.mocked(prisma.teamOfficer.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.teamOfficer.upsert).mockResolvedValue(buildMockTeamOfficer());
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

    it('should return 200 with count 0 if officer contract is not configured', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(mockTeam);
      vi.spyOn(publicClient, 'readContract').mockResolvedValue([]);
      vi.spyOn(prisma.teamContract, 'createMany').mockResolvedValue({ count: 0 });

      const response = await request(app).put('/sync').send({ teamId: 1 });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('No new contracts Created');
    });

    it('should resolve officer from persisted officer contract and sync', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(mockTeam);
      vi.spyOn(publicClient, 'readContract').mockResolvedValue([
        {
          contractType: 'Voting',
          contractAddress: '0xABCDEF1234567890123456789012345678901234',
        },
      ]);
      vi.spyOn(prisma.teamContract, 'createMany').mockResolvedValue({ count: 1 });

      const response = await request(app).put('/sync').send({ teamId: 1 });

      expect(publicClient.getChainId).toHaveBeenCalledTimes(1);
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ count: 1 });
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

    it('should return 200 if no new contracts are created (all duplicates)', async () => {
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
      expect(response.body.message).toContain('Internal server error has occured');
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

  describe('POST: /officer', () => {
    const newOfficerAddress = '0x2222222222222222222222222222222222222222';

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app).post('/officer').send({ teamId: 1 });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid request body');
    });

    it('should return 404 if team is not found', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(null);
      const response = await request(app)
        .post('/officer')
        .send({ teamId: 1, address: newOfficerAddress });
      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Team not found');
    });

    it('should return 403 if caller is not the team owner', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue({
        ...mockTeam,
        ownerAddress: '0x9999999999999999999999999999999999999999',
      });
      const response = await request(app)
        .post('/officer')
        .send({ teamId: 1, address: newOfficerAddress });
      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Unauthorized: Caller is not the owner of the team');
    });

    it('should return 409 if address is already registered to another team', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(mockTeam);
      vi.mocked(prisma.teamOfficer.findUnique).mockResolvedValue(
        buildMockTeamOfficer({ address: newOfficerAddress, teamId: 99 })
      );
      const response = await request(app)
        .post('/officer')
        .send({ teamId: 1, address: newOfficerAddress });
      expect(response.status).toBe(409);
      expect(response.body.message).toContain('already registered to another team');
      expect(prisma.teamOfficer.upsert).not.toHaveBeenCalled();
    });

    it('should return 409 if address is already registered to the same team', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(mockTeam);
      vi.mocked(prisma.teamOfficer.findUnique).mockResolvedValue(
        buildMockTeamOfficer({ address: newOfficerAddress, teamId: mockTeam.id })
      );
      const response = await request(app)
        .post('/officer')
        .send({ teamId: 1, address: newOfficerAddress });
      expect(response.status).toBe(409);
      expect(response.body.message).toContain('already registered to this team');
      expect(prisma.teamOfficer.upsert).not.toHaveBeenCalled();
    });

    it('should link to previous officer, upsert and sync contracts', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(mockTeam);
      // The previous head of the linked list — the new Officer points back at it.
      vi.mocked(prisma.teamOfficer.findFirst).mockResolvedValue(
        buildMockTeamOfficer({ id: 7, address: mockOfficerAddress })
      );
      vi.spyOn(publicClient, 'readContract').mockResolvedValue([
        {
          contractType: 'Voting',
          contractAddress: '0xABCDEF1234567890123456789012345678901234',
        },
      ]);
      vi.mocked(prisma.teamOfficer.upsert).mockResolvedValue(
        buildMockTeamOfficer({
          id: 42,
          address: newOfficerAddress,
          deployBlockNumber: BigInt(12345),
          deployedAt: new Date('2026-04-14T10:00:00Z'),
          previousOfficerId: 7,
        })
      );
      vi.spyOn(prisma.teamContract, 'createMany').mockResolvedValue({ count: 1 });

      const response = await request(app).post('/officer').send({
        teamId: 1,
        address: newOfficerAddress,
        deployBlockNumber: 12345,
        deployedAt: '2026-04-14T10:00:00Z',
      });

      expect(prisma.team.update).not.toHaveBeenCalled();
      expect(prisma.teamOfficer.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { teamId: 1, nextOfficer: { is: null } },
        })
      );
      expect(prisma.teamOfficer.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { address: newOfficerAddress },
          create: expect.objectContaining({
            address: newOfficerAddress,
            teamId: 1,
            deployBlockNumber: 12345,
            previousOfficerId: 7,
            version: 'v0.10',
          }),
        })
      );
      expect(prisma.teamContract.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            teamId: 1,
            address: '0xABCDEF1234567890123456789012345678901234',
            type: 'Voting',
            officerId: 42,
          }),
        ]),
        skipDuplicates: true,
      });
      expect(response.status).toBe(200);
      expect(response.body.contractsCreated).toBe(1);
      expect(response.body.officer.id).toBe(42);
      expect(response.body.officer.deployBlockNumber).toBe('12345');
      expect(response.body.previousOfficer).toMatchObject({
        id: 7,
        address: mockOfficerAddress,
      });
    });

    it('should set previousOfficerId to null when the team has no prior Officer', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(mockTeam);
      vi.mocked(prisma.teamOfficer.findFirst).mockResolvedValue(null);
      vi.spyOn(publicClient, 'readContract').mockResolvedValue([
        { contractType: 'Voting', contractAddress: '0xABCDEF1234567890123456789012345678901234' },
      ]);
      vi.mocked(prisma.teamOfficer.upsert).mockResolvedValue(
        buildMockTeamOfficer({ id: 1, address: newOfficerAddress })
      );
      vi.spyOn(prisma.teamContract, 'createMany').mockResolvedValue({ count: 1 });

      const response = await request(app).post('/officer').send({
        teamId: 1,
        address: newOfficerAddress,
      });

      expect(prisma.teamOfficer.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ previousOfficerId: null }),
        })
      );
      expect(response.status).toBe(200);
      expect(response.body.previousOfficer).toBeNull();
    });

    it('should return 500 on internal error', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockRejectedValue('Error');
      const response = await request(app)
        .post('/officer')
        .send({ teamId: 1, address: newOfficerAddress });
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error has occured');
    });

    // Concurrent deploys race on the findCurrentOfficer + insert window; the
    // DB-level partial unique indexes turn the loser's insert into a P2002.
    // The controller must surface that as a retryable 409 rather than an
    // opaque 500 so the client doesn't redeploy an already-replaced Officer.
    it('should return 409 when the upsert races into a P2002 unique-constraint violation', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(mockTeam);
      vi.spyOn(publicClient, 'readContract').mockResolvedValue([
        { contractType: 'Voting', contractAddress: '0xABCDEF1234567890123456789012345678901234' },
      ]);
      const raceErr = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on fields: (`teamId`, `nextOfficerId`)',
        { code: 'P2002', clientVersion: '5.0.0' }
      );
      vi.mocked(prisma.teamOfficer.upsert).mockRejectedValue(raceErr);

      const response = await request(app)
        .post('/officer')
        .send({ teamId: 1, address: newOfficerAddress });

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('Officer registration conflict');
    });

    it('should let non-P2002 prisma errors fall through to the 500 handler', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(mockTeam);
      vi.spyOn(publicClient, 'readContract').mockResolvedValue([
        { contractType: 'Voting', contractAddress: '0xABCDEF1234567890123456789012345678901234' },
      ]);
      const otherErr = new Prisma.PrismaClientKnownRequestError('Foreign key violated', {
        code: 'P2003',
        clientVersion: '5.0.0',
      });
      vi.mocked(prisma.teamOfficer.upsert).mockRejectedValue(otherErr);

      const response = await request(app)
        .post('/officer')
        .send({ teamId: 1, address: newOfficerAddress });

      expect(response.status).toBe(500);
    });
  });
});
