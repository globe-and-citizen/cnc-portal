import { Team, Wage } from '@prisma/client';
import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import wageRoutes from '../../routes/wageRoute';
import { prisma } from '../../utils';

vi.mock('../../utils', async () => {
  const actual = await vi.importActual('../../utils');
  return {
    ...actual,
    prisma: {
      team: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
      wage: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    },
  };
});
vi.mock('../../utils/viem.config');

// Mock the authorization middleware with proper hoisting
vi.mock('../../middleware/authMiddleware', () => ({
  authorizeUser: vi.fn((req: Request, res: Response, next: NextFunction) => {
    // Default behavior - can be overridden in tests
    req.address = '0x1234567890123456789012345678901234567890';
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

const mockWage = {
  id: 1,
  teamId: 1,
  userAddress: '0x1234567890123456789012345678901234567890',
  ratePerHour: [
    { type: 'cash', amount: 50 },
    { type: 'token', amount: 100 },
  ],
  overtimeRatePerHour: null,
  maximumOvertimeHoursPerWeek: null,
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
        req.address = '0x1234567890123456789012345678901234567890';
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

    it('should store DbNull when overtimeRatePerHour is explicitly null', async () => {
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue(mockTeam);
      vi.spyOn(prisma.wage, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma.wage, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.wage, 'create').mockResolvedValue(mockWage);

      const response = await request(app)
        .put('/setWage')
        .send({
          teamId: 1,
          userAddress: '0x1234567890123456789012345678901234567890',
          ratePerHour: [{ type: 'cash', amount: 50 }],
          overtimeRatePerHour: null,
          maximumHoursPerWeek: 40,
        });

      expect(response.status).toBe(201);
      expect(prisma.wage.create).toHaveBeenCalled();
    });

    it('should persist overtime rates when provided', async () => {
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue(mockTeam);
      vi.spyOn(prisma.wage, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma.wage, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.wage, 'create').mockResolvedValue({
        ...mockWage,
        overtimeRatePerHour: [{ type: 'cash', amount: 75 }],
        maximumOvertimeHoursPerWeek: 8,
      } as Wage);

      const response = await request(app)
        .put('/setWage')
        .send({
          teamId: 1,
          userAddress: '0x1234567890123456789012345678901234567890',
          ratePerHour: [
            { type: 'cash', amount: 50 },
            { type: 'token', amount: 100 },
          ],
          overtimeRatePerHour: [{ type: 'cash', amount: 75 }],
          maximumOvertimeHoursPerWeek: 8,
          maximumHoursPerWeek: 40,
        });

      expect(response.status).toBe(201);
      expect(prisma.wage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            overtimeRatePerHour: [{ type: 'cash', amount: 75 }],
            maximumOvertimeHoursPerWeek: 8,
          }),
        })
      );
      expect(response.body.maximumOvertimeHoursPerWeek).toBe(8);
    });

    it('should return 400 if overtime rates are provided without maximumOvertimeHoursPerWeek', async () => {
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
          overtimeRatePerHour: [{ type: 'cash', amount: 75 }],
          maximumHoursPerWeek: 40,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        'Invalid request body - maximumOvertimeHoursPerWeek: Maximum overtime hours per week is required when overtime rates are provided'
      );
    });

    it('should return the newly created wage when an active wage already exists', async () => {
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue(mockTeam);
      vi.spyOn(prisma.wage, 'findFirst').mockResolvedValue(mockWage);
      vi.spyOn(prisma.wage, 'create').mockResolvedValue({
        ...mockWage,
        id: 2,
        overtimeRatePerHour: [{ type: 'cash', amount: 80 }],
        maximumOvertimeHoursPerWeek: 12,
      } as Wage);

      const response = await request(app)
        .put('/setWage')
        .send({
          teamId: 1,
          userAddress: '0x1234567890123456789012345678901234567890',
          ratePerHour: [
            { type: 'cash', amount: 50 },
            { type: 'token', amount: 100 },
          ],
          overtimeRatePerHour: [{ type: 'cash', amount: 80 }],
          maximumOvertimeHoursPerWeek: 12,
          maximumHoursPerWeek: 40,
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBe(2);
      expect(response.body.maximumOvertimeHoursPerWeek).toBe(12);
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

    it('should return 500 on internal server error', async () => {
      vi.spyOn(prisma.team, 'findFirst').mockRejectedValue(new Error('Database error'));

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
      expect(response.body.message).toContain('Internal server error');
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

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid request body');
    });

    it('should return 400 if maximumHoursPerWeek alone exceeds 40', async () => {
      const response = await request(app)
        .put('/setWage')
        .send({
          teamId: 1,
          userAddress: '0x1234567890123456789012345678901234567890',
          ratePerHour: [{ type: 'cash', amount: 50 }],
          maximumHoursPerWeek: 41,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain(
        'Maximum regular hours per week cannot exceed 40 hours'
      );
    });

    it('should return 400 if maximumOvertimeHoursPerWeek exceeds 20', async () => {
      const response = await request(app)
        .put('/setWage')
        .send({
          teamId: 1,
          userAddress: '0x1234567890123456789012345678901234567890',
          ratePerHour: [{ type: 'cash', amount: 50 }],
          overtimeRatePerHour: [{ type: 'cash', amount: 75 }],
          maximumHoursPerWeek: 40,
          maximumOvertimeHoursPerWeek: 21,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain(
        'Maximum overtime hours per week cannot exceed 20 hours'
      );
    });

    it('should return 400 if the current wage is disabled', async () => {
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue(mockTeam);
      vi.spyOn(prisma.wage, 'findFirst').mockResolvedValue({ ...mockWage, disabled: true } as Wage);

      const response = await request(app)
        .put('/setWage')
        .send({
          teamId: 1,
          userAddress: '0x1234567890123456789012345678901234567890',
          ratePerHour: [{ type: 'cash', amount: 50 }],
          maximumHoursPerWeek: 40,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Cannot set wage: the current wage is disabled');
    });

    it('should allow max limits of exactly 40 regular + 20 overtime', async () => {
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue(mockTeam);
      vi.spyOn(prisma.wage, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma.wage, 'findMany').mockResolvedValue([]);
      vi.spyOn(prisma.wage, 'create').mockResolvedValue({
        ...mockWage,
        maximumHoursPerWeek: 40,
        maximumOvertimeHoursPerWeek: 20,
      } as Wage);

      const response = await request(app)
        .put('/setWage')
        .send({
          teamId: 1,
          userAddress: '0x1234567890123456789012345678901234567890',
          ratePerHour: [{ type: 'cash', amount: 50 }],
          overtimeRatePerHour: [{ type: 'cash', amount: 75 }],
          maximumHoursPerWeek: 40,
          maximumOvertimeHoursPerWeek: 20,
        });

      expect(response.status).toBe(201);
    });
  });

  describe('GET: /', () => {
    // Reset all mock functions before each test
    beforeEach(() => {
      vi.clearAllMocks();
      // Reset to default behavior

      mockAuthorizeUser.mockImplementation((req: Request, res: Response, next: NextFunction) => {
        req.address = '0x1234567890123456789012345678901234567890';
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
      expect(response.body.message).toBe('Caller is not a member of the team');
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

    it('should return wages with null maximumOvertimeHoursPerWeek for legacy records', async () => {
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue(mockTeam);
      vi.spyOn(prisma.wage, 'findMany').mockResolvedValue([
        {
          ...mockWage,
          overtimeRatePerHour: [{ type: 'cash', amount: 75 }],
          maximumOvertimeHoursPerWeek: null,
          maximumHoursPerWeek: 40,
          //@ts-expect-error: wage relationship
          previousWage: null,
        },
      ]);

      const response = await request(app).get('/').query({ teamId: 1 });

      expect(response.status).toBe(200);
      expect(response.body[0].maximumOvertimeHoursPerWeek).toBeNull();
    });

    it('should return wages with existing maximumOvertimeHoursPerWeek unchanged', async () => {
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue(mockTeam);
      vi.spyOn(prisma.wage, 'findMany').mockResolvedValue([
        {
          ...mockWage,
          overtimeRatePerHour: [{ type: 'cash', amount: 75 }],
          maximumOvertimeHoursPerWeek: 400,
          maximumHoursPerWeek: 40,
          //@ts-expect-error: wage relationship
          previousWage: null,
        },
      ]);

      const response = await request(app).get('/').query({ teamId: 1 });

      expect(response.status).toBe(200);
      expect(response.body[0].maximumOvertimeHoursPerWeek).toBe(400);
    });

    it('should not overwrite maximumOvertimeHoursPerWeek when it already has a value', async () => {
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue(mockTeam);
      vi.spyOn(prisma.wage, 'findMany').mockResolvedValue([
        {
          ...mockWage,
          overtimeRatePerHour: [{ type: 'cash', amount: 75 }],
          maximumOvertimeHoursPerWeek: 8,
          maximumHoursPerWeek: 40,
          //@ts-expect-error: wage relationship
          previousWage: null,
        },
      ]);

      const response = await request(app).get('/').query({ teamId: 1 });

      expect(response.status).toBe(200);
      expect(response.body[0].maximumOvertimeHoursPerWeek).toBe(8);
    });
  });

  describe('PUT: /:wageId', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockAuthorizeUser.mockImplementation((req: Request, res: Response, next: NextFunction) => {
        req.address = '0x1234567890123456789012345678901234567890';
        next();
      });
    });

    it('should return 400 if wageId is not a valid integer', async () => {
      const response = await request(app).put('/abc').query({ action: 'disable' });
      expect(response.status).toBe(400);
    });

    it('should return 400 if action is invalid', async () => {
      const response = await request(app).put('/1').query({ action: 'invalid' });
      expect(response.status).toBe(400);
    });

    it('should return 404 if wage not found', async () => {
      vi.spyOn(prisma.wage, 'findFirst').mockResolvedValue(null);

      const response = await request(app).put('/1').query({ action: 'disable' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Wage not found');
    });

    it('should return 403 if caller is not the owner of the team', async () => {
      vi.spyOn(prisma.wage, 'findFirst').mockResolvedValue(mockWage);
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue(null);

      const response = await request(app).put('/1').query({ action: 'disable' });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Caller is not the owner of the team');
    });

    it('should disable a wage', async () => {
      vi.spyOn(prisma.wage, 'findFirst').mockResolvedValue(mockWage);
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue(mockTeam);
      vi.spyOn(prisma.wage, 'update').mockResolvedValue({ ...mockWage, disabled: true } as Wage);

      const response = await request(app).put('/1').query({ action: 'disable' });

      expect(response.status).toBe(200);
      expect(response.body.disabled).toBe(true);
      expect(prisma.wage.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { disabled: true } })
      );
    });

    it('should enable a wage', async () => {
      vi.spyOn(prisma.wage, 'findFirst').mockResolvedValue({ ...mockWage, disabled: true } as Wage);
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue(mockTeam);
      vi.spyOn(prisma.wage, 'update').mockResolvedValue({ ...mockWage, disabled: false } as Wage);

      const response = await request(app).put('/1').query({ action: 'enable' });

      expect(response.status).toBe(200);
      expect(response.body.disabled).toBe(false);
      expect(prisma.wage.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { disabled: false } })
      );
    });

    it('should return 500 on internal server error', async () => {
      vi.spyOn(prisma.wage, 'findFirst').mockRejectedValue(new Error('Database error'));

      const response = await request(app).put('/1').query({ action: 'disable' });

      expect(response.status).toBe(500);
      expect(response.body.message).toContain('Internal server error');
    });
  });
});
