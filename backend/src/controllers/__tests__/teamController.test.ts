import { faker } from '@faker-js/faker';
import { Team, User } from '@prisma/client';
import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authorizeUser } from '../../middleware/authMiddleware';
import teamRoutes from '../../routes/teamRoutes';
import { prisma } from '../../utils';

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
        create: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      teamMember: {
        findUnique: vi.fn(),
        create: vi.fn(),
        createMany: vi.fn(),
      },
      boardOfDirectorActions: {
        deleteMany: vi.fn(),
      },
      memberTeamsData: {
        deleteMany: vi.fn(),
      },
      teamContract: {
        deleteMany: vi.fn(),
      },
      weeklyClaim: {
        deleteMany: vi.fn(),
      },
      claim: {
        deleteMany: vi.fn(),
      },
      wage: {
        deleteMany: vi.fn(),
      },
      expense: {
        deleteMany: vi.fn(),
      },
    },
    addNotification: vi.fn(),
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
app.use('/', authorizeUser, teamRoutes);

const mockOwner: User = {
  address: '0x1234567890123456789012345678901234567890',
  name: 'Test Owner',
  nonce: '123456',
  imageUrl: 'https://example.com/image.jpg',
  createdAt: new Date(),
  updatedAt: new Date(),
};
const mockTeamData = {
  name: 'Test Team',
  description: 'Test Description',
  members: [
    { address: faker.finance.ethereumAddress(), name: 'Member 1' },
    { address: faker.finance.ethereumAddress(), name: 'Member 2' },
  ],

  officerAddress: '0xOfficerAddress',
};

const teamMockResolve: Team = {
  ...mockTeamData,
  id: 1,
  ownerAddress: mockOwner.address,

  members: [
    {
      address: '0xmember1address000000000000000000000000',
      name: 'Member 1',
      imageUrl: 'https://example.com/image.jpg',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      address: mockOwner.address,
      name: mockOwner.name,
      imageUrl: 'https://example.com/image.jpg',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
};

describe('Team Controller', () => {
  describe('addTeam', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return 400 if invalid wallet address provided', async () => {
      const response = await request(app)
        .post('/')
        .send({
          ...mockTeamData,
          members: [{ address: 'invalid-address', name: 'Invalid Member' }],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toEqual('Invalid wallet address for member: Invalid Member');
    });

    it('should return 400 if invalid Safe address provided', async () => {
      const response = await request(app)
        .post('/')
        .send({
          ...mockTeamData,
          safeAddress: 'not-a-safe-address',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toEqual('Invalid Safe address');
    });

    it('should return 201 and create a team with a valid Safe address', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockOwner);
      vi.spyOn(prisma.team, 'create').mockResolvedValue(teamMockResolve);

      const response = await request(app)
        .post('/')
        .send({
          ...mockTeamData,
          safeAddress: '0x1234567890123456789012345678901234567890',
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toEqual('Test Team');
    });

    it('should return 201 and create a team successfully', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockOwner);
      vi.spyOn(prisma.team, 'create').mockResolvedValue(teamMockResolve);

      const response = await request(app).post('/').send(mockTeamData);

      expect(response.status).toBe(201);
      expect(response.body.name).toEqual('Test Team');
    });

    it('should return 201 and create a team successfully with the team owner in team members', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockOwner);
      vi.spyOn(prisma.team, 'create').mockResolvedValue(teamMockResolve);

      const response = await request(app)
        .post('/')
        .send({
          ...mockTeamData,
          members: mockTeamData.members.concat({
            address: mockOwner.address,
            name: mockOwner.name,
          }),
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toEqual('Test Team');
    });

    it('should return 500 if there is a server error', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockRejectedValue(new Error('Server error'));

      const response = await request(app).post('/').send(mockTeamData);

      expect(response.status).toBe(500);
      expect(response.body.message).toEqual('Internal server error has occured');
    });
  });

  describe('getTeam', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return 403 if user is not part of the team', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue({
        id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        name: 'Test Team',
        ownerAddress: '0xOwnerAddress',
        description: 'Test Description',
        officerAddress: '0xOfficerAddress',
      });

      const response = await request(app).get('/1').query({ teamId: 1 }).set('address', '0xDEF');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should return 404 if team is not found', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(null);

      const response = await request(app).get('/1').query({ teamId: 1 }).set('address', '0xABC');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Team not found');
    });

    it('should return 200 and team data if user is part of the team', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(teamMockResolve);

      const response = await request(app)
        .get('/1')
        .query({ teamId: 1 })
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      // expect(response.body).toEqual(teamMockResolve);
    });

    it('should return 500 if an exception is thrown', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockRejectedValue(new Error('DB failure'));

      const response = await request(app).get('/1').query({ teamId: 1 }).set('address', '0xABC');

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error has occured');
    });
  });

  describe('getAllTeams', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return 200 and all teams when no userAddress is provided', async () => {
      const mockTeams = [
        {
          id: 1,
          name: 'Team 1',
          description: 'Description 1',
          ownerAddress: '0xOtherOwner',
          _count: { members: 3 },
        },
        {
          id: 2,
          name: 'Team 2',
          description: 'Description 2',
          ownerAddress: mockOwner.address,
          _count: { members: 5 },
        },
      ];

      vi.spyOn(prisma.team, 'findMany').mockResolvedValue(mockTeams);

      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTeams);
      expect(prisma.team.findMany).toHaveBeenCalledWith({
        include: {
          _count: {
            select: {
              members: true,
            },
          },
        },
      });
    });

    it('should return 200 and only user teams when userAddress matches callerAddress', async () => {
      const mockTeams = [
        {
          id: 1,
          name: 'Team 1',
          description: 'Description 1',
          ownerAddress: mockOwner.address,
          _count: { members: 3 },
        },
        {
          id: 2,
          name: 'Team 2',
          description: 'Description 2',
          ownerAddress: mockOwner.address,
          _count: { members: 5 },
        },
      ];

      vi.spyOn(prisma.team, 'findMany').mockResolvedValue(mockTeams);

      const response = await request(app).get('/').query({ userAddress: mockOwner.address });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTeams);
      expect(prisma.team.findMany).toHaveBeenCalledWith({
        where: {
          members: {
            some: {
              address: mockOwner.address,
            },
          },
        },
        include: {
          _count: {
            select: {
              members: true,
            },
          },
        },
      });
    });

    it('should return 403 when userAddress does not match callerAddress', async () => {
      const response = await request(app)
        .get('/')
        .query({ userAddress: '0xDifferentAddress1234567890123456789' });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should return 500 if an error occurs', async () => {
      vi.spyOn(prisma.team, 'findMany').mockRejectedValue(new Error('Database failure'));

      const response = await request(app).get('/');

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error has occured');
    });
  });

  describe('updateTeam', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return 400 if invalid Safe address provided', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue({
        id: 1,
        ownerAddress: mockOwner.address,
        name: 'Test Team',
        description: 'Test Description',
        officerAddress: '0xOfficerAddress',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app).put('/1').send({
        id: 1,
        name: 'Updated Team',
        description: 'Updated Description',
        officerAddress: '0xNewOfficerAddress',
        safeAddress: 'not-a-safe-address',
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toEqual('Invalid Safe address');
    });

    it('should return 200 and update the team with a valid Safe address', async () => {
      const mockTeam = {
        id: 1,
        ownerAddress: mockOwner.address,
        name: 'Test Team',
        description: 'Test Description',
        officerAddress: '0xOfficerAddress',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(mockTeam);
      vi.spyOn(prisma.team, 'update').mockResolvedValue({
        ...mockTeam,
        name: 'Updated Team',
        description: 'Updated Description',
        officerAddress: '0xNewOfficerAddress',
        safeAddress: '0x1234567890123456789012345678901234567890',
      });

      const response = await request(app).put('/1').send({
        id: 1,
        name: 'Updated Team',
        description: 'Updated Description',
        officerAddress: '0xNewOfficerAddress',
        safeAddress: '0x1234567890123456789012345678901234567890',
      });

      expect(response.status).toBe(200);
      expect(response.body.name).toEqual('Updated Team');
      expect(response.body.safeAddress).toEqual('0x1234567890123456789012345678901234567890');
    });

    it('should return 404 if team not found', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(null);

      const response = await request(app).put('/1').send({
        id: 1,
        name: 'Updated Team',
        description: 'Updated Description',
        officerAddress: '0xNewOfficerAddress',
      });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Team not found');
    });

    it('should return 403 if user is not the team owner', async () => {
      const mockTeam = {
        id: 1,
        ownerAddress: faker.finance.ethereumAddress(),
        name: 'Test Team',
        description: 'Test Description',
        officerAddress: '0xOfficerAddress',
      };

      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(mockTeam);

      const response = await request(app).put('/1').send({
        id: 1,
        name: 'Updated Team',
        description: 'Updated Description',
        officerAddress: '0xNewOfficerAddress',
      });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should return 200 and update the team successfully', async () => {
      const mockTeam = {
        id: 1,
        ownerAddress: mockOwner.address,
        name: 'Test Team',
        description: 'Test Description',
        officerAddress: '0xOfficerAddress',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(mockTeam);
      vi.spyOn(prisma.team, 'update').mockResolvedValue({
        ...mockTeam,
        name: 'Updated Team',
        description: 'Updated Description',
        officerAddress: '0xNewOfficerAddress',
      });

      const response = await request(app).put('/1').send({
        id: 1,

        owenrAddress: mockOwner.address,
        name: 'Updated Team',
        description: 'Updated Description',
        officerAddress: '0xNewOfficerAddress',
      });

      expect(response.status).toBe(200);
      expect(response.body.name).toEqual('Updated Team');
    });

    it('should return 500 if there is a server error', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue({
        id: 1,
        ownerAddress: mockOwner.address,
        name: 'Test Team',
        description: 'Test Description',
        officerAddress: '0xOfficerAddress',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.spyOn(prisma.team, 'update').mockRejectedValue(new Error('Server error'));

      const response = await request(app).put('/1').send(mockTeamData);

      expect(response.status).toBe(500);
      expect(response.body.message).toEqual('Internal server error has occured');
    });
  });

  describe('deleteTeam', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return 404 if team not found', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(null);

      const response = await request(app).delete('/1').set('address', '0xOwnerAddress');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Team not found');
    });

    it('should return 403 if user is not the team owner', async () => {
      const mockTeam = {
        id: 1,
        ownerAddress: '0xDifferentAddress',
        name: 'Test Team',
        description: 'Test Description',
        officerAddress: '0xOfficerAddress',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(mockTeam);

      const response = await request(app).delete('/1').set('address', '0xAnotherAddress');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should return 200 and delete the team successfully', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(teamMockResolve);
      vi.spyOn(prisma.team, 'delete').mockResolvedValue(teamMockResolve);
      vi.spyOn(prisma.boardOfDirectorActions, 'deleteMany').mockResolvedValue({
        count: 0,
      });
      vi.spyOn(prisma.memberTeamsData, 'deleteMany').mockResolvedValue({
        count: 0,
      });
      vi.spyOn(prisma.teamContract, 'deleteMany').mockResolvedValue({
        count: 0,
      });
      vi.spyOn(prisma.boardOfDirectorActions, 'deleteMany').mockResolvedValue({
        count: 0,
      });
      vi.spyOn(prisma.weeklyClaim, 'deleteMany').mockResolvedValue({
        count: 0,
      });
      vi.spyOn(prisma.claim, 'deleteMany').mockResolvedValue({
        count: 0,
      });
      vi.spyOn(prisma.wage, 'deleteMany').mockResolvedValue({
        count: 0,
      });
      vi.spyOn(prisma.expense, 'deleteMany').mockResolvedValue({
        count: 0,
      });

      const response = await request(app).delete('/1').set('address', '0xOwnerAddress');

      expect(response.status).toBe(204);
    });

    it('should return 500 if there is a server error', async () => {
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue(teamMockResolve);
      vi.spyOn(prisma.team, 'delete').mockRejectedValue(new Error('Server error'));

      const response = await request(app).delete('/1').set('address', '0xOwnerAddress');

      expect(response.status).toBe(500);
      expect(response.body.message).toEqual('Internal server error has occured');
    });
  });
});
