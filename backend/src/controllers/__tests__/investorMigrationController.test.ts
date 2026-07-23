import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../../utils';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import publicClient from '../../utils/viem.config';
import investorMigrationRoutes from '../../routes/investorMigrationRoute';
import { authorizeUser } from '../../middleware/authMiddleware';
import { buildMerkleProofSet, generateMerkleSnapshot } from '../../services/merkleSnapshotService';

const CALLER_ADDRESS = '0x1234567890123456789012345678901234567890';
const NEW_INVESTOR_ADDRESS = '0x9876543210987654321098765432109876543210';
const PREVIOUS_INVESTOR_ADDRESS = '0x1111111111111111111111111111111111111111';
const SOME_ROOT = '0x2222222222222222222222222222222222222222222222222222222222222222';

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
      investorMigration: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      team: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
    },
  };
});

vi.mock('../../utils/viem.config', () => ({
  default: {
    readContract: vi.fn(),
  },
}));

vi.mock('../../services/merkleSnapshotService', () => ({
  buildMerkleProofSet: vi.fn(),
  generateMerkleSnapshot: vi.fn(),
}));

const app = express();
app.use(express.json());
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
});
app.use('/', limiter, authorizeUser, investorMigrationRoutes);

const mockMigration = {
  id: 1,
  teamId: 1,
  previousInvestorAddress: PREVIOUS_INVESTOR_ADDRESS,
  newInvestorAddress: NEW_INVESTOR_ADDRESS,
  merkleRoot: SOME_ROOT,
  blockNumber: 42n,
  shareholders: [{ shareholder: PREVIOUS_INVESTOR_ADDRESS, amount: '100' }],
  createdAt: new Date(),
};

describe('InvestorMigration Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.team.findUnique).mockResolvedValue({ isArchived: false } as never);
    vi.mocked(prisma.team.findFirst).mockResolvedValue({ id: 1 } as never);
  });

  describe('POST: /', () => {
    const validBody = {
      teamId: 1,
      previousInvestorAddress: PREVIOUS_INVESTOR_ADDRESS,
      newInvestorAddress: NEW_INVESTOR_ADDRESS,
      merkleRoot: SOME_ROOT,
      blockNumber: 42,
      shareholders: [{ shareholder: PREVIOUS_INVESTOR_ADDRESS, amount: '100' }],
    };

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app).post('/').send({ teamId: 1 });

      expect(response.status).toBe(400);
    });

    it('should return 403 if the caller is not the on-chain owner', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValueOnce(
        '0x0000000000000000000000000000000000000000'
      );

      const response = await request(app).post('/').send(validBody);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Caller is not the owner of the new Investor contract');
    });

    it('should create a migration record', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValueOnce(CALLER_ADDRESS);
      vi.mocked(prisma.investorMigration.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.investorMigration.create).mockResolvedValueOnce(mockMigration as never);

      const response = await request(app).post('/').send(validBody);

      expect(response.status).toBe(201);
      expect(response.body.blockNumber).toBe('42');
      expect(prisma.investorMigration.create).toHaveBeenCalledWith({
        data: {
          teamId: validBody.teamId,
          previousInvestorAddress: validBody.previousInvestorAddress,
          newInvestorAddress: validBody.newInvestorAddress,
          merkleRoot: validBody.merkleRoot,
          blockNumber: validBody.blockNumber,
          shareholders: validBody.shareholders,
        },
      });
    });

    it('should return the existing record when the same snapshot is resubmitted (idempotent retry)', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValueOnce(CALLER_ADDRESS);
      vi.mocked(prisma.investorMigration.findUnique).mockResolvedValueOnce(mockMigration as never);

      const response = await request(app).post('/').send(validBody);

      expect(response.status).toBe(200);
      expect(response.body.blockNumber).toBe('42');
      expect(prisma.investorMigration.create).not.toHaveBeenCalled();
    });

    it('should return 409 when a different migration already exists for this Investor contract', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValueOnce(CALLER_ADDRESS);
      vi.mocked(prisma.investorMigration.findUnique).mockResolvedValueOnce({
        ...mockMigration,
        merkleRoot: '0x9999999999999999999999999999999999999999999999999999999999999999',
      } as never);

      const response = await request(app).post('/').send(validBody);

      expect(response.status).toBe(409);
      expect(response.body.message).toBe(
        'A different migration snapshot already exists for this Investor contract'
      );
      expect(prisma.investorMigration.create).not.toHaveBeenCalled();
    });

    it('should return 500 if there is a server error', async () => {
      vi.spyOn(publicClient, 'readContract').mockResolvedValueOnce(CALLER_ADDRESS);
      vi.mocked(prisma.investorMigration.findUnique).mockRejectedValueOnce('Server error');

      const response = await request(app).post('/').send(validBody);

      expect(response.status).toBe(500);
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

    it('should return all migrations for a team with computed proofs', async () => {
      vi.mocked(prisma.investorMigration.findMany).mockResolvedValueOnce([mockMigration] as never);
      vi.mocked(buildMerkleProofSet).mockReturnValueOnce({
        root: SOME_ROOT,
        proofs: { [PREVIOUS_INVESTOR_ADDRESS]: ['0xproof'] },
      });

      const response = await request(app).get('/').query({ teamId: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].blockNumber).toBe('42');
      expect(response.body[0].proofs).toEqual({ [PREVIOUS_INVESTOR_ADDRESS]: ['0xproof'] });
      expect(prisma.investorMigration.findMany).toHaveBeenCalledWith({
        where: { teamId: 1 },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return 500 when the persisted root does not match its recomputed snapshot', async () => {
      vi.mocked(prisma.investorMigration.findMany).mockResolvedValueOnce([mockMigration] as never);
      vi.mocked(buildMerkleProofSet).mockReturnValueOnce({
        root: '0x9999999999999999999999999999999999999999999999999999999999999999',
        proofs: {},
      });

      const response = await request(app).get('/').query({ teamId: 1 });

      expect(response.status).toBe(500);
    });

    it('should return 500 if there is a server error', async () => {
      vi.mocked(prisma.investorMigration.findMany).mockRejectedValueOnce('Server error');

      const response = await request(app).get('/').query({ teamId: 1 });

      expect(response.status).toBe(500);
    });
  });

  describe('POST: /generate', () => {
    it('should return 400 if investorV1Address is missing', async () => {
      const response = await request(app).post('/generate').send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('investorV1Address is required');
    });

    it('should return the generated snapshot', async () => {
      const snapshot = {
        root: SOME_ROOT,
        shareholders: [{ address: PREVIOUS_INVESTOR_ADDRESS, amount: '100' }],
        proofs: { [PREVIOUS_INVESTOR_ADDRESS]: ['0xproof'] },
        blockNumber: 42,
        totalSupply: '100',
      };
      vi.mocked(generateMerkleSnapshot).mockResolvedValueOnce(snapshot);

      const response = await request(app)
        .post('/generate')
        .send({ investorV1Address: PREVIOUS_INVESTOR_ADDRESS });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(snapshot);
      expect(generateMerkleSnapshot).toHaveBeenCalledWith(PREVIOUS_INVESTOR_ADDRESS);
    });

    it('should return 500 if snapshot generation fails (e.g. sum/totalSupply mismatch)', async () => {
      vi.mocked(generateMerkleSnapshot).mockRejectedValueOnce(
        new Error('Shareholder sum does not match totalSupply')
      );

      const response = await request(app)
        .post('/generate')
        .send({ investorV1Address: PREVIOUS_INVESTOR_ADDRESS });

      expect(response.status).toBe(500);
    });
  });
});
