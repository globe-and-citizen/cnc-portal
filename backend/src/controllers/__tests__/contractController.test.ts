import { faker } from '@faker-js/faker';
import { Prisma, Team, TeamOfficer } from '@prisma/client';
import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { getAddress } from 'viem';
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
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
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
    getCode: vi.fn(),
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
    vi.mocked(prisma.teamContract.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.teamContract.updateMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.teamOfficer.findFirst).mockResolvedValue(buildMockTeamOfficer());
    vi.mocked(prisma.teamOfficer.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.teamOfficer.upsert).mockResolvedValue(buildMockTeamOfficer());
  });

  describe('PUT: /sync', () => {
    it('returns 400 if required fields are missing or invalid', async () => {
      const response = await request(app).put('/sync');
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid request body');

      const responseV2 = await request(app).put('/sync').send({ teamId: 'invalid' });

      expect(responseV2.status).toBe(400);
      expect(response.body.message).toContain('Invalid request body');
    });

    it('returns 404 if team not found', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(null);
      const response = await request(app).put('/sync').send({ teamId: 1 });
      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Team not found');
    });

    it('returns 200 with count 0 if officer contract is not configured', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(mockTeam);
      vi.spyOn(publicClient, 'readContract').mockResolvedValue([]);
      vi.spyOn(prisma.teamContract, 'createMany').mockResolvedValue({ count: 0 });

      const response = await request(app).put('/sync').send({ teamId: 1 });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('No new contracts Created');
    });

    it('resolves officer from persisted officer contract and sync', async () => {
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

    it('returns 403 if caller is not the owner of the team', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue({
        ...mockTeam,
        ownerAddress: '0x456',
      });

      const response = await request(app).put('/sync').send({ teamId: 1 });
      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Unauthorized: Caller is not the owner of the team');
    });

    it('returns 400 if no contracts are created', async () => {
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

    it('returns 200 if no new contracts are created (all duplicates)', async () => {
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

    it('creates and returns new company contracts', async () => {
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

    it('returns 200 if contracts are found', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(mockTeam);
      // mock readContract
      vi.spyOn(publicClient, 'readContract').mockResolvedValue([
        {
          contractType: 'Voting',
          contractAddress: '0xABCDEF1234567890123456789012345678901234',
        },
      ]);
      // mock createMany
      vi.spyOn(prisma.teamContract, 'createMany').mockResolvedValue({
        count: 1,
      });

      const response = await request(app).put('/sync').send({ teamId: 1 });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ count: 1 });
    });

    it('reports a contract synchronization failure', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockRejectedValue('Server error');
      const response = await request(app).put('/sync').send({ teamId: 1 });
      expect(response.status).toBe(500);
      expect(response.body.message).toContain('Internal server error has occured');
    });
  });

  describe('GET: /', () => {
    it('returns 400 if teamId is invalid', async () => {
      const response = await request(app).get('/').query({ teamId: 'abc' });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid query parameters - teamId: Must be a number');
    });

    it('returns 404 if no contracts are found', async () => {
      vi.spyOn(prisma.teamContract, 'findMany').mockResolvedValue([]);
      const response = await request(app).get('/').query({ teamId: 1 });
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Team or contracts not found');
    });

    it('lists contracts for a company', async () => {
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

    it('reports a persistence failure while listing contracts', async () => {
      vi.spyOn(prisma.teamContract, 'findMany').mockRejectedValue('Error');
      const response = await request(app).get('/').query({ teamId: 1 });
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error has occured');
    });
  });

  describe('POST: /', () => {
    it('returns 400 if required fields are missing', async () => {
      const response = await request(app).post('/').send({});
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid request body');
    });

    it('returns 400 if contract address is invalid', async () => {
      const response = await request(app).post('/').send({
        teamId: 1,
        contractAddress: 'invalid',
        contractType: 'Voting',
      });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid request body');
    });

    it('returns 400 if contract type is invalid', async () => {
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

    it('returns 404 if team is not found', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(null);
      const response = await request(app).post('/').send({
        teamId: 1,
        contractAddress: faker.finance.ethereumAddress(),
        contractType: 'Voting',
      });
      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Team not found');
    });

    it('returns 403 if caller is not the owner of the team', async () => {
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

    it('creates and returns a company contract', async () => {
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

    it('reports a persistence failure while registering a contract', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockRejectedValue('Test');
      const response = await request(app).post('/').send({
        teamId: 1,
        contractAddress: faker.finance.ethereumAddress(),
        contractType: 'Voting',
      });
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error has occured');
    });

    it('registers a Safe deployed through the ABI-based deployment path', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(mockTeam);
      vi.spyOn(prisma.teamContract, 'create').mockResolvedValue({
        id: 1,
        teamId: 1,
        address: '0xSafeAddress',
        type: 'Safe',
        deployer: mockTeam.ownerAddress,
        officerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const response = await request(app).post('/').send({
        teamId: 1,
        contractAddress: faker.finance.ethereumAddress(),
        contractType: 'Safe',
      });
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ type: 'Safe', officerId: null });
    });

    it('normalizes and registers a Safe when the company has no existing Safe', async () => {
      const address = getAddress('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(mockTeam);
      vi.mocked(prisma.teamContract.create).mockResolvedValue({
        id: 1,
        teamId: mockTeam.id,
        address: address.toLowerCase(),
        type: 'Safe',
        deployer: mockTeam.ownerAddress,
        officerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app).post('/').send({
        teamId: mockTeam.id,
        contractAddress: address,
        contractType: 'Safe',
      });

      expect(response.status).toBe(200);
      expect(prisma.teamContract.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ address: address.toLowerCase(), type: 'Safe' }),
      });
    });

    describe('with an existing Safe history', () => {
      const safeAddress = getAddress('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
      const buildSafe = (overrides: object = {}) => ({
        id: 1,
        teamId: mockTeam.id,
        address: safeAddress.toLowerCase(),
        type: 'Safe',
        deployer: mockTeam.ownerAddress,
        officerId: null,
        activatedAt: new Date(),
        removedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
      });
      const registerSafe = () =>
        request(app)
          .post('/')
          .send({ teamId: mockTeam.id, contractAddress: safeAddress, contractType: 'Safe' });

      beforeEach(() => {
        vi.mocked(prisma.team.findUnique).mockResolvedValue(mockTeam);
      });

      it('returns the default Safe when its registration is retried', async () => {
        vi.mocked(prisma.teamContract.findFirst)
          .mockResolvedValueOnce(buildSafe() as never)
          .mockResolvedValueOnce(buildSafe() as never);

        const response = await registerSafe();

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({ id: 1 });
        expect(prisma.teamContract.create).not.toHaveBeenCalled();
      });

      it('[AC-US-SAFE-001-12] registers another Safe that becomes the default', async () => {
        vi.mocked(prisma.teamContract.create).mockResolvedValue(buildSafe({ id: 2 }) as never);

        const response = await registerSafe();

        expect(response.status).toBe(200);
        expect(prisma.teamContract.findFirst).toHaveBeenCalledTimes(1);
        expect(prisma.teamContract.create).toHaveBeenCalledWith({
          data: expect.objectContaining({ address: safeAddress.toLowerCase(), type: 'Safe' }),
        });
      });

      it("[AC-US-SAFE-001-13] rejects a Safe already in the team's history", async () => {
        vi.mocked(prisma.teamContract.findFirst)
          .mockResolvedValueOnce(buildSafe({ removedAt: new Date() }) as never)
          .mockResolvedValueOnce(buildSafe({ id: 2, address: '0xbb' }) as never);

        const response = await registerSafe();

        expect(response.status).toBe(409);
        expect(response.body.message).toContain("already in the team's Safe history");
        expect(prisma.teamContract.create).not.toHaveBeenCalled();
      });

      it('[AC-US-SAFE-001-13] rejects a Safe address assigned to another team', async () => {
        vi.mocked(prisma.teamContract.findFirst).mockResolvedValueOnce(
          buildSafe({ id: 2, teamId: 2 }) as never
        );

        const response = await registerSafe();

        expect(response.status).toBe(409);
        expect(response.body.message).toContain('Safe address is already assigned to another team');
      });

      it('returns 409 when a concurrent registration wins', async () => {
        vi.mocked(prisma.teamContract.create).mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: '5.0.0',
          })
        );

        const response = await registerSafe();

        expect(response.status).toBe(409);
        expect(response.body.message).toContain('Safe registration conflict');
      });
    });
  });

  describe('PUT: /safe', () => {
    const safeAddress = getAddress('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    const safe = {
      id: 7,
      teamId: mockTeam.id,
      address: safeAddress.toLowerCase(),
      type: 'Safe',
      deployer: mockTeam.ownerAddress,
      officerId: null,
      activatedAt: new Date('2026-01-01'),
      removedAt: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };
    const updateSafe = (action: string, body: object = {}) =>
      request(app)
        .put('/safe')
        .send({ teamId: mockTeam.id, contractAddress: safeAddress, action, ...body });

    beforeEach(() => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue(mockTeam);
      vi.mocked(prisma.teamContract.findFirst).mockResolvedValue(safe as never);
      vi.mocked(prisma.teamContract.update)
        .mockReset()
        .mockImplementation((args: any) => ({ ...safe, ...args.data }) as never);
    });

    it('[AC-US-SAFE-001-16] makes a Safe of the team its default again', async () => {
      const response = await updateSafe('default');

      expect(response.status).toBe(200);
      expect(prisma.teamContract.findFirst).toHaveBeenCalledWith({
        where: {
          teamId: mockTeam.id,
          type: 'Safe',
          address: { equals: safeAddress, mode: 'insensitive' },
        },
      });
      expect(prisma.teamContract.update).toHaveBeenCalledWith({
        where: { id: safe.id },
        data: { activatedAt: expect.any(Date), removedAt: null },
      });
    });

    it('[AC-US-SAFE-001-17] removes a Safe while keeping its row', async () => {
      const response = await updateSafe('remove');

      expect(response.status).toBe(200);
      expect(prisma.teamContract.update).toHaveBeenCalledWith({
        where: { id: safe.id },
        data: { removedAt: expect.any(Date) },
      });
      expect(response.body.removedAt).toBeTruthy();
    });

    it('[AC-US-SAFE-001-14] returns 403 when the caller is not the team owner', async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue({ ...mockTeam, ownerAddress: '0x456' });

      const response = await updateSafe('default');

      expect(response.status).toBe(403);
      expect(prisma.teamContract.update).not.toHaveBeenCalled();
    });

    it('[AC-US-SAFE-001-14] returns 409 when the team is archived', async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue({ ...mockTeam, isArchived: true });

      const response = await updateSafe('remove');

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('Team is archived');
      expect(prisma.teamContract.update).not.toHaveBeenCalled();
    });

    it.each([
      ['an invalid Safe address', 'default', { contractAddress: '0x123' }],
      ['an unknown action', 'replace', {}],
    ])('returns 400 for %s', async (_case, action, body) => {
      const response = await updateSafe(action, body);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid request body');
    });

    it('returns 404 when the Safe is not one of the team Safes', async () => {
      vi.mocked(prisma.teamContract.findFirst).mockResolvedValue(null);

      const response = await updateSafe('default');

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Safe not found in this team');
    });

    it('reports a persistence failure', async () => {
      vi.mocked(prisma.teamContract.update).mockRejectedValue(new Error('db down'));

      const response = await updateSafe('default');

      expect(response.status).toBe(500);
    });
  });

  describe('POST: /officer', () => {
    const newOfficerAddress = '0x2222222222222222222222222222222222222222';

    it('returns 400 if required fields are missing', async () => {
      const response = await request(app).post('/officer').send({ teamId: 1 });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid request body');
    });

    it('returns 404 if team is not found', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(null);
      const response = await request(app)
        .post('/officer')
        .send({ teamId: 1, address: newOfficerAddress });
      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Team not found');
    });

    it('returns 403 if caller is not the team owner', async () => {
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

    it('returns 409 if address is already registered to another team', async () => {
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

    it('returns 409 if address is already registered to the same team', async () => {
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

    it('links to previous officer, upsert and sync contracts', async () => {
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
            version: 'unknown',
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

    it('sets previousOfficerId to null when the team has no prior Officer', async () => {
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

    it('returns 500 on internal error', async () => {
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
    it('returns 409 when the upsert races into a P2002 unique-constraint violation', async () => {
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

    it('lets non-P2002 prisma errors fall through to the 500 handler', async () => {
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
