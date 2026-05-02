import { faker } from '@faker-js/faker';
import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addMembers, deleteMember } from '../memberController';
import teamRoutes from '../../routes/teamRoutes';
import { prisma } from '../../utils';

// Hoisted mock variables
const { mockAuthorizeUser } = vi.hoisted(() => ({
  mockAuthorizeUser: vi.fn((req: Request, res: Response, next: NextFunction) => {
    req.address = '0x1234567890123456789012345678901234567890';
    next();
  }),
}));

// Mock the authorizeUser middleware
vi.mock('../../middleware/authMiddleware', () => ({
  authorizeUser: mockAuthorizeUser,
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
      teamMember: {
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        createMany: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      memberTeamsData: {
        delete: vi.fn(),
      },
    },
  };
});

// Create test app with middleware
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(mockAuthorizeUser);
  app.use('/team', teamRoutes);
  return app;
};

// Test data
const mockOwner = {
  address: '0x1234567890123456789012345678901234567890',
  name: 'Test Owner',
  nonce: '123456',
};

const fakeMembers = [
  { address: faker.finance.ethereumAddress(), name: 'Member 3' },
  { address: faker.finance.ethereumAddress(), name: 'Member 4' },
];

const mockResolvedTeam = {
  createdAt: new Date(),
  updatedAt: new Date(),
  id: 1,
  name: 'Test Team',
  description: 'Test Description',
  ownerAddress: mockOwner.address,
  bankAddress: null,
  votingAddress: null,
  boardOfDirectorsAddress: null,
  expenseAccountAddress: null,
  investorsAddress: null,
  expenseAccountEip712Address: null,
  cashRemunerationEip712Address: null,
  BoardOfDirectorActions: null,
  members: [
    { address: '0x2222222222222222222222222222222222222222', name: 'Member 1' },
    { address: '0x4444444444444444444444444444444444444444', name: 'Member 2' },
    { address: mockOwner.address, name: mockOwner.name },
  ],
};

const createMockRes = () => {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.end = vi.fn().mockReturnValue(res);
  return res as Response;
};

describe('Member Controller', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createTestApp();
    mockAuthorizeUser.mockImplementation((req: Request, res: Response, next: NextFunction) => {
      req.address = mockOwner.address;
      next();
    });
  });

  describe('POST: /team/:id/member', () => {
    it('should add members', async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue(mockResolvedTeam);
      vi.mocked(prisma.team.update).mockResolvedValueOnce(mockResolvedTeam);

      const response = await request(app).post('/team/1/member').send(fakeMembers);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ members: mockResolvedTeam.members });
    });

    it('should return 400 when Member is not well formatted', async () => {
      const response = await request(app)
        .post('/team/1/member')
        .send([
          { address: 'Not Valid address', name: 'Member 3' },
          { address: faker.finance.ethereumAddress(), name: 'Member 4' },
        ]);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid');
    });

    it('Should return 404 when team is not found', async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue(null);

      const response = await request(app).post('/team/1/member').send(fakeMembers);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Team not found' });
    });

    it('Should return 400 when members already exist in the team', async () => {
      const teamWithExistingMembers = {
        ...mockResolvedTeam,

        members: fakeMembers.map((member) => ({ address: member.address, name: member.name })),
      };
      vi.mocked(prisma.team.findUnique).mockResolvedValue(teamWithExistingMembers as any);

      const response = await request(app).post('/team/1/member').send(fakeMembers);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: `Members ${fakeMembers.map((member) => member.address)} already in the team`,
      });
    });

    it('Should return 403 when the caller is not the owner', async () => {
      const teamWithDifferentOwner = {
        ...mockResolvedTeam,
        ownerAddress: '0xNotOwnerAddress',
      };

      vi.mocked(prisma.team.findUnique).mockResolvedValue(teamWithDifferentOwner);

      const response = await request(app).post('/team/1/member').send(fakeMembers);

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        message: 'Unauthorized: Caller is not the owner of the team',
      });
    });

    it('Should return 500 when an error occurs', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(prisma.team.findUnique).mockRejectedValue('Server error');

      const response = await request(app).post('/team/1/member').send(fakeMembers);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: 'Internal server error has occured',
        error: '',
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('DELETE: /team/:id/member/:memberAddress', () => {
    it('should delete member', async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue(mockResolvedTeam);
      vi.mocked(prisma.team.update).mockResolvedValue(mockResolvedTeam);
      vi.mocked(prisma.memberTeamsData.delete).mockResolvedValueOnce({} as any);

      const response = await request(app).delete(
        '/team/1/member/0x2222222222222222222222222222222222222222'
      );

      expect(response.status).toBe(204);
    });

    it('should return 404 when team is not found', async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue(null);

      const response = await request(app).delete(
        '/team/1/member/0x2222222222222222222222222222222222222222'
      );

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Team not found' });
    });

    it('should return 404 when member is not found in the team', async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue(mockResolvedTeam);

      const response = await request(app).delete(
        '/team/1/member/0x5555555555555555555555555555555555555555'
      );

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: 'Member not found in the team',
      });
    });

    it('should return 403 when the caller is not the owner', async () => {
      const teamWithDifferentOwner = {
        ...mockResolvedTeam,
        ownerAddress: '0xNotOwnerAddress',
      };

      vi.mocked(prisma.team.findUnique).mockResolvedValue(teamWithDifferentOwner);

      const response = await request(app).delete(
        '/team/1/member/0x2222222222222222222222222222222222222222'
      );

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        message: 'Unauthorized: Caller is not the owner of the team',
      });
    });

    it('should return 403 when the owner is trying to delete himself', async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValue(mockResolvedTeam);
      vi.mocked(prisma.team.update).mockResolvedValue(mockResolvedTeam);

      const response = await request(app).delete(`/team/1/member/${mockOwner.address}`);

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        message: 'Unauthorized: The Owner cannot be removed',
      });
    });

    it('should return 500 when an error occurs', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(prisma.team.findUnique).mockRejectedValue('Server error');

      const response = await request(app).delete(
        '/team/1/member/0x2222222222222222222222222222222222222222'
      );

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: 'Internal server error has occured',
        error: '',
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Direct controller coverage', () => {
    it('addMembers should return 404 when team is missing in controller', async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValueOnce(null);

      const req = {
        params: { id: 1 },
        body: fakeMembers,
      } as unknown as Request;
      const res = createMockRes();

      await addMembers(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Team not found' });
    });

    it('addMembers should return 500 with Error message when findUnique throws Error', async () => {
      vi.mocked(prisma.team.findUnique).mockRejectedValueOnce(new Error('findUnique failed'));

      const req = {
        params: { id: 1 },
        body: fakeMembers,
      } as unknown as Request;
      const res = createMockRes();

      await addMembers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error has occured',
        error: '',
      });
    });

    it('addMembers should return 500 fallback when findUnique throws non-Error', async () => {
      vi.mocked(prisma.team.findUnique).mockRejectedValueOnce('findUnique failed');

      const req = {
        params: { id: 1 },
        body: fakeMembers,
      } as unknown as Request;
      const res = createMockRes();

      await addMembers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error has occured',
        error: '',
      });
    });

    it('deleteMember should return 404 when team is missing in controller', async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValueOnce(null);

      const req = {
        params: { id: 1, memberAddress: '0x2222222222222222222222222222222222222222' },
      } as unknown as Request;
      const res = createMockRes();

      await deleteMember(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Team not found' });
    });

    it('deleteMember should return 500 when memberTeamsData.delete throws Error', async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValueOnce(mockResolvedTeam as any);
      vi.mocked(prisma.memberTeamsData.delete).mockRejectedValueOnce(new Error('delete failed'));

      const req = {
        params: { id: 1, memberAddress: '0x2222222222222222222222222222222222222222' },
      } as unknown as Request;
      const res = createMockRes();

      await deleteMember(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error has occured',
        error: '',
      });
    });

    it('deleteMember should return 500 fallback when memberTeamsData.delete throws non-Error', async () => {
      vi.mocked(prisma.team.findUnique).mockResolvedValueOnce(mockResolvedTeam as any);
      vi.mocked(prisma.memberTeamsData.delete).mockRejectedValueOnce('delete failed');

      const req = {
        params: { id: 1, memberAddress: '0x2222222222222222222222222222222222222222' },
      } as unknown as Request;
      const res = createMockRes();

      await deleteMember(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error has occured',
        error: '',
      });
    });

    it('deleteMember should return 500 with Error message when outer try fails with Error', async () => {
      vi.mocked(prisma.team.findUnique).mockRejectedValueOnce(new Error('team lookup failed'));

      const req = {
        params: { id: 1, memberAddress: '0x2222222222222222222222222222222222222222' },
      } as unknown as Request;
      const res = createMockRes();

      await deleteMember(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error has occured',
        error: '',
      });
    });

    it('deleteMember should return 500 fallback when outer try fails with non-Error', async () => {
      vi.mocked(prisma.team.findUnique).mockRejectedValueOnce('team lookup failed');

      const req = {
        params: { id: 1, memberAddress: '0x2222222222222222222222222222222222222222' },
      } as unknown as Request;
      const res = createMockRes();

      await deleteMember(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error has occured',
        error: '',
      });
    });
  });
});
