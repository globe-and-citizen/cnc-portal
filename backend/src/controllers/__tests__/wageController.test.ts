import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import wageRoutes from '../../routes/wageRoute';
import { prisma } from '../../utils';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { Team, Wage } from '@prisma/client';

vi.mock('../../utils');
vi.mock('../../utils/viem.config');

// Mock the authorization middleware with proper hoisting
vi.mock('../../middleware/authMiddleware', () => ({
  authorizeUser: vi.fn((req: Request, res: Response, next: NextFunction) => {
    // Default behavior - can be overridden in tests
    (req as any).address = '0x1234567890123456789012345678901234567890';
    next();
  }),
}));

// Import the mocked function after mocking
import { authorizeUser } from '../../middleware/authMiddleware';
const mockAuthorizeUser = vi.mocked(authorizeUser);

const app = express();
app.use(express.json());
// Use the actual wageRoutes from the routes file
app.use('/', wageRoutes);

const mockTeam = {
  id: 1,
  name: 'TeamName',
  ownerAddress: '0x1234567890123456789012345678901234567890',
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  officerAddress: '0x2234567890123456789012345678901234567890',
} as Team;

const mockMember = {
  address: '0x1234567890123456789012345678901234567890',
};
const mockWage = {
  id: 1,
  teamId: 1,
  userAddress: '0x1234567890123456789012345678901234567890',
  ratePerHour: [
    { type: 'cash', amount: 50 },
    { type: 'token', amount: 100 },
  ],
  maximumHoursPerWeek: 40,
  nextWageId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as Wage;

describe('Wage Controller', () => {
  describe('PUT: /setWage', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // Reset to default behavior
      mockAuthorizeUser.mockImplementation((req: Request, res: Response, next: NextFunction) => {
        (req as any).address = '0x1234567890123456789012345678901234567890';
        next();
      });
    });

    it('should return 400 if required parameters are missing', async () => {
      const response = await request(app).put('/setWage').send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid request body');
    });

    it('should return 400 if parameters are invalid', async () => {
      const response = await request(app)
        .put('/setWage')
        .send({
          teamId: 1,
          userAddress: '0x1234567890123456789012345678901234567890',
          ratePerHour: [
            { type: 'cash', amount: -50 },
            { type: 'token', amount: 100 },
          ],
          maximumHoursPerWeek: '0.5',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid request body');
    });

    it('should return 403 if caller is not the owner of the team', async () => {
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValueOnce(null);
      vi.spyOn(prisma.wage, 'create').mockResolvedValue(mockWage);
      const response = await request(app)
        .put('/setWage')
        .send({
          teamId: 1,
          userAddress: '0x1234567890123456789012345678901234567890',
          ratePerHour: [
            { type: 'cash', amount: 50 },
            { type: 'token', amount: 100 },
          ],
          maximumHoursPerWeek: 40,
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Caller is not the owner of the team');
    });

    it('should create a new wage if no previous wage exists', async () => {
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue(mockTeam);
      vi.spyOn(prisma.wage, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma.wage, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.wage, 'create').mockResolvedValue(mockWage);

      const response = await request(app)
        .put('/setWage')
        .send({
          teamId: 1,
          userAddress: '0x1234567890123456789012345678901234567890',
          ratePerHour: [
            { type: 'cash', amount: 50 },
            { type: 'token', amount: 100 },
          ],
          maximumHoursPerWeek: 40,
        });

      expect(response.status).toBe(201);
      expect(prisma.wage.create).toHaveBeenCalled();
    });

    it('should return 500 if all wage have a next wage', async () => {
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue(mockTeam);
      vi.spyOn(prisma.wage, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma.wage, 'findMany').mockResolvedValue([mockWage]);
      vi.spyOn(prisma.wage, 'create').mockResolvedValue(mockWage);

      const response = await request(app)
        .put('/setWage')
        .send({
          teamId: 1,
          userAddress: '0x1234567890123456789012345678901234567890',
          ratePerHour: [
            { type: 'cash', amount: 50 },
            { type: 'token', amount: 100 },
          ],
          maximumHoursPerWeek: 40,
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toContain('Internal server error has occured');
    });

    it('should chain a new wage to the previous wage if it exists', async () => {
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue(mockTeam);
      vi.spyOn(prisma.wage, 'findFirst').mockResolvedValue(mockWage);
      vi.spyOn(prisma.wage, 'create').mockResolvedValue(mockWage);

      const response = await request(app)
        .put('/setWage')
        .send({
          teamId: 1,
          userAddress: '0x1234567890123456789012345678901234567890',
          ratePerHour: [
            { type: 'cash', amount: 50 },
            { type: 'token', amount: 100 },
          ],
          maximumHoursPerWeek: 40,
        });

      expect(response.status).toBe(201);
      expect(prisma.wage.create).toHaveBeenCalled();
    });

    it('should return 500 if there is a server error', async () => {
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue(mockTeam);
      vi.spyOn(prisma.wage, 'findFirst').mockRejectedValue('Server error');

      const response = await request(app).put('/setWage').send({
        teamId: 1,
        userAddress: '0x1234567890123456789012345678901234567890',
        ratePerHour: [],
        maximumHoursPerWeek: 40,
      });

      // console.log({ body: response.body, status: response.status });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid request body');
    });
  });

  describe('GET: /', () => {
    // Reset all mock functions before each test
    beforeEach(() => {
      vi.clearAllMocks();
      // Reset to default behavior
      mockAuthorizeUser.mockImplementation((req: Request, res: Response, next: NextFunction) => {
        (req as any).address = '0x1234567890123456789012345678901234567890';
        next();
      });
    });

    it('should return 400 if teamId is invalid', async () => {
      const response = await request(app).get('/').query({ teamId: 'abc' });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid query parameters');
    });

    it('should return 403 if user is not a team member', async () => {
      // Simulate the case where the user is not a member of the team
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue(null); //  return false

      const response = await request(app).get('/').query({ teamId: 1 });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Member is not a team member');
    });

    it('should return 200 and wages if user is a team member', async () => {
      // Simulate that the user is indeed a member of the team
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue(mockTeam);

      // Simulate returning wages data
      vi.spyOn(prisma.wage, 'findMany').mockResolvedValue([
        {
          ...mockWage,
          //@ts-expect-error: wage relationship
          previousWage: { id: 0 },
        },
      ]);

      const response = await request(app).get('/').query({ teamId: 1 });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty(
        'userAddress',
        '0x1234567890123456789012345678901234567890'
      );
    });

    it('should return 500 on internal server error', async () => {
      // Simulate a database error when checking team membership
      vi.spyOn(prisma.team, 'findFirst').mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/').query({ teamId: 1 });

      expect(response.status).toBe(500);
      expect(response.body.message).toContain('Internal server error');
    });
  });
});
