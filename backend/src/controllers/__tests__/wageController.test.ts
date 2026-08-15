import { Team, Wage } from '@prisma/client';
import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import wageRoutes from '../../routes/wageRoute';
import { prisma } from '../../utils';

vi.mock('../../utils', async () => {
  const actual = await vi.importActual('../../utils');
  const prismaMock: Record<string, unknown> = {
    team: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    wage: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
  prismaMock.$transaction = vi.fn(async (cb: (tx: unknown) => unknown) => cb(prismaMock));
  return {
    ...actual,
    prisma: prismaMock,
  };
});
vi.mock('../../utils/viem.config');

// Only the two helpers that read WeeklyClaim rows are stubbed; the rule that
// turns "has this member submitted hours?" into an effective date stays real,
// so these tests exercise it rather than restate it.
const { mockWeekHasClaims, mockMembersWithClaimsThisWeek } = vi.hoisted(() => ({
  mockWeekHasClaims: vi.fn(),
  mockMembersWithClaimsThisWeek: vi.fn(),
}));

vi.mock('../../utils/wageResolution', async () => {
  const actual = await vi.importActual<typeof import('../../utils/wageResolution')>(
    '../../utils/wageResolution'
  );
  return {
    ...actual,
    weekHasClaims: mockWeekHasClaims,
    membersWithClaimsThisWeek: mockMembersWithClaimsThisWeek,
  };
});

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
// Mount the mocked authorizeUser so it sets req.address, matching production wiring.
app.use(mockAuthorizeUser);
app.use('/', wageRoutes);

const mockTeam = {
  id: 1,
  name: 'TeamName',
  ownerAddress: '0x1234567890123456789012345678901234567890',
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
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

/** A date comfortably inside the next ISO week, so the wage reads as scheduled. */
const futureDate = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

describe('Wage Controller', () => {
  describe('PUT: /setWage', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // Reset to default behavior
      mockAuthorizeUser.mockImplementation((req: Request, res: Response, next: NextFunction) => {
        req.address = '0x1234567890123456789012345678901234567890';
        next();
      });
      // Default: requireTeamOwner middleware finds the team owned by the caller
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue({
        ...mockTeam,
        isArchived: false,
      });
      // Default: the member has not opened the current week.
      mockWeekHasClaims.mockResolvedValue(false);
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
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue({
        ...mockTeam,
        ownerAddress: '0x0000000000000000000000000000000000000000',
      });
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
      expect(response.body.message).toBe('Unauthorized: Caller is not the owner of the team');
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

    it('should default the daily cap to 8 hours when it is not provided', async () => {
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue(mockTeam);
      vi.spyOn(prisma.wage, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma.wage, 'findMany').mockResolvedValue([]);
      const createSpy = vi.spyOn(prisma.wage, 'create').mockResolvedValue(mockWage);

      const response = await request(app)
        .put('/setWage')
        .send({
          teamId: 1,
          userAddress: '0x1234567890123456789012345678901234567890',
          ratePerHour: [{ type: 'cash', amount: 50 }],
          maximumHoursPerWeek: 40,
        });

      expect(response.status).toBe(201);
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ maximumHoursPerDay: 8 }),
        })
      );
    });

    it('should persist the daily cap provided by the owner', async () => {
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue(mockTeam);
      vi.spyOn(prisma.wage, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma.wage, 'findMany').mockResolvedValue([]);
      const createSpy = vi.spyOn(prisma.wage, 'create').mockResolvedValue(mockWage);

      const response = await request(app)
        .put('/setWage')
        .send({
          teamId: 1,
          userAddress: '0x1234567890123456789012345678901234567890',
          ratePerHour: [{ type: 'cash', amount: 50 }],
          maximumHoursPerWeek: 40,
          maximumHoursPerDay: 6,
        });

      expect(response.status).toBe(201);
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ maximumHoursPerDay: 6 }),
        })
      );
    });

    it('should reject a daily cap above 24 hours', async () => {
      const response = await request(app)
        .put('/setWage')
        .send({
          teamId: 1,
          userAddress: '0x1234567890123456789012345678901234567890',
          ratePerHour: [{ type: 'cash', amount: 50 }],
          maximumHoursPerWeek: 40,
          maximumHoursPerDay: 25,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid request body');
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
      vi.spyOn(prisma.team, 'findUnique').mockRejectedValue(new Error('Database error'));

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

    const validBody = {
      teamId: 1,
      userAddress: '0x1234567890123456789012345678901234567890',
      ratePerHour: [{ type: 'cash', amount: 60 }],
      maximumHoursPerWeek: 40,
    };

    /** Arranges a change on top of an existing wage, hours submitted or not. */
    const arrangeChange = (weekIsSubmitted: boolean) => {
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue(mockTeam);
      vi.spyOn(prisma.wage, 'findFirst').mockResolvedValue(mockWage);
      mockWeekHasClaims.mockResolvedValue(weekIsSubmitted);
      vi.spyOn(prisma.wage, 'update').mockResolvedValue(mockWage);

      return vi.spyOn(prisma.wage, 'create').mockResolvedValue({ ...mockWage, id: 2 } as Wage);
    };

    it('should defer a change to the next Monday when hours are already submitted', async () => {
      // Those hours are priced against the current wage and cannot be repriced
      // without splitting the week across two WeeklyClaims (issue #2479).
      const createSpy = arrangeChange(true);

      const response = await request(app).put('/setWage').send(validBody);

      expect(response.status).toBe(201);
      const effectiveFrom = createSpy.mock.calls[0][0].data.effectiveFrom as Date;
      expect(effectiveFrom.getUTCDay()).toBe(1);
      expect(effectiveFrom.getUTCHours()).toBe(0);
      expect(effectiveFrom.getTime()).toBeGreaterThan(Date.now());
    });

    it('should apply a change to the current week when no hours are submitted', async () => {
      // Nothing is submitted yet, so the whole week can take the new terms —
      // the owner chose not to wait for their member to submit.
      const createSpy = arrangeChange(false);

      const response = await request(app).put('/setWage').send(validBody);

      expect(response.status).toBe(201);
      const effectiveFrom = createSpy.mock.calls[0][0].data.effectiveFrom as Date;
      expect(effectiveFrom.getUTCDay()).toBe(1);
      expect(effectiveFrom.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should anchor the effective date to a Monday even when applied immediately', async () => {
      // Resolution compares the effective date against the *start* of the week,
      // so a mid-week timestamp would exclude the new wage from the very week
      // it is meant to cover.
      const createSpy = arrangeChange(false);

      await request(app).put('/setWage').send(validBody);

      const effectiveFrom = createSpy.mock.calls[0][0].data.effectiveFrom as Date;
      expect(effectiveFrom.getUTCHours()).toBe(0);
      expect(effectiveFrom.getUTCMinutes()).toBe(0);
      expect(effectiveFrom.getUTCSeconds()).toBe(0);
    });

    it('should apply the very first wage from the current Monday', async () => {
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue(mockTeam);
      vi.spyOn(prisma.wage, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma.wage, 'findMany').mockResolvedValue([]);
      const createSpy = vi.spyOn(prisma.wage, 'create').mockResolvedValue(mockWage);

      const response = await request(app).put('/setWage').send(validBody);

      expect(response.status).toBe(201);
      const effectiveFrom = createSpy.mock.calls[0][0].data.effectiveFrom as Date;
      expect(effectiveFrom.getUTCDay()).toBe(1);
      expect(effectiveFrom.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should rewrite a scheduled wage in place without moving its effective date', async () => {
      // Correcting a typo before Monday must not push the change back a week,
      // nor leave a dead link in the chain.
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue(mockTeam);
      vi.spyOn(prisma.wage, 'findFirst')
        .mockResolvedValueOnce({ ...mockWage, id: 2, effectiveFrom: futureDate() } as Wage)
        .mockResolvedValueOnce({ ...mockWage, id: 1, nextWageId: 2 } as Wage);
      const updateSpy = vi.spyOn(prisma.wage, 'update').mockResolvedValue(mockWage);
      const createSpy = vi.spyOn(prisma.wage, 'create');

      const response = await request(app).put('/setWage').send(validBody);

      expect(response.status).toBe(200);
      expect(createSpy).not.toHaveBeenCalled();
      expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 2 } }));
      expect(updateSpy.mock.calls[0][0].data).not.toHaveProperty('effectiveFrom');
    });

    it('should refuse to rewrite a scheduled wage when the active one is disabled', async () => {
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue(mockTeam);
      vi.spyOn(prisma.wage, 'findFirst')
        .mockResolvedValueOnce({ ...mockWage, id: 2, effectiveFrom: futureDate() } as Wage)
        .mockResolvedValueOnce({ ...mockWage, id: 1, nextWageId: 2, disabled: true } as Wage);

      const response = await request(app).put('/setWage').send(validBody);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Cannot set wage: the current wage is disabled');
    });
  });

  describe('DELETE: /scheduled', () => {
    const query = { teamId: 1, userAddress: '0x1234567890123456789012345678901234567890' };

    beforeEach(() => {
      vi.clearAllMocks();
      mockAuthorizeUser.mockImplementation((req: Request, res: Response, next: NextFunction) => {
        req.address = '0x1234567890123456789012345678901234567890';
        next();
      });
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue({ ...mockTeam, isArchived: false });
    });

    it('should unlink and delete the scheduled wage, leaving the predecessor in force', async () => {
      const predecessor = { ...mockWage, id: 1, nextWageId: 2 } as Wage;
      vi.spyOn(prisma.wage, 'findFirst')
        .mockResolvedValueOnce({ ...mockWage, id: 2, effectiveFrom: futureDate() } as Wage)
        .mockResolvedValueOnce(predecessor);
      const updateSpy = vi.spyOn(prisma.wage, 'update').mockResolvedValue(predecessor);
      const deleteSpy = vi.spyOn(prisma.wage, 'delete').mockResolvedValue(mockWage);

      const response = await request(app).delete('/scheduled').query(query);

      expect(response.status).toBe(200);
      expect(updateSpy).toHaveBeenCalledWith({ where: { id: 1 }, data: { nextWageId: null } });
      expect(deleteSpy).toHaveBeenCalledWith({ where: { id: 2 } });
      expect(response.body).toMatchObject({ id: 1 });
    });

    it('should return 404 when the leaf wage is already in force', async () => {
      vi.spyOn(prisma.wage, 'findFirst').mockResolvedValue({
        ...mockWage,
        effectiveFrom: null,
      } as Wage);

      const response = await request(app).delete('/scheduled').query(query);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('No scheduled wage change to cancel');
    });

    it('should return 404 when the member has no wage at all', async () => {
      vi.spyOn(prisma.wage, 'findFirst').mockResolvedValue(null);

      const response = await request(app).delete('/scheduled').query(query);

      expect(response.status).toBe(404);
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
      // Default: nobody has opened the current week yet.
      mockMembersWithClaimsThisWeek.mockResolvedValue(new Set<string>());
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

    it('should surface the active wage, not the scheduled one, when a change is pending', async () => {
      // The claim form validates against this payload, so it must carry the
      // rates and caps that apply right now — never the upcoming ones.
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue(mockTeam);

      const activeWage = {
        ...mockWage,
        id: 1,
        maximumHoursPerWeek: 40,
        effectiveFrom: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        nextWageId: 2,
      };
      const scheduledLeaf = {
        ...mockWage,
        id: 2,
        maximumHoursPerWeek: 45,
        effectiveFrom: futureDate(),
      };

      // The endpoint reads the whole chain and splits it in memory.
      vi.spyOn(prisma.wage, 'findMany').mockResolvedValue([activeWage, scheduledLeaf] as never);

      const response = await request(app).get('/').query({ teamId: 1 });

      expect(response.status).toBe(200);
      expect(response.body[0]).toMatchObject({ id: 1, maximumHoursPerWeek: 40 });
      expect(response.body[0].scheduledWage).toMatchObject({ id: 2, maximumHoursPerWeek: 45 });
    });

    it('should tell the caller when a change saved now would take effect', async () => {
      // The set-wage modal announces this date, so it has to come from the same
      // rule the server applies rather than being recomputed on the front end.
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue(mockTeam);
      vi.spyOn(prisma.wage, 'findMany').mockResolvedValue([
        { ...mockWage, effectiveFrom: new Date('2026-01-05T00:00:00.000Z') } as never,
      ]);
      mockMembersWithClaimsThisWeek.mockResolvedValue(new Set([mockWage.userAddress]));

      const response = await request(app).get('/').query({ teamId: 1 });

      expect(response.status).toBe(200);
      const announced = new Date(response.body[0].nextChangeEffectiveFrom);
      expect(announced.getUTCDay()).toBe(1);
      expect(announced.getTime()).toBeGreaterThan(Date.now());
    });

    it('should date an immediate change to this week for a member with no hours in', async () => {
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue(mockTeam);
      vi.spyOn(prisma.wage, 'findMany').mockResolvedValue([
        { ...mockWage, effectiveFrom: new Date('2026-01-05T00:00:00.000Z') } as never,
      ]);

      const response = await request(app).get('/').query({ teamId: 1 });

      expect(response.status).toBe(200);
      const announced = new Date(response.body[0].nextChangeEffectiveFrom);
      expect(announced.getUTCDay()).toBe(1);
      expect(announced.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should return the leaf with a null scheduledWage when no change is pending', async () => {
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue(mockTeam);
      vi.spyOn(prisma.wage, 'findMany').mockResolvedValue([
        { ...mockWage, effectiveFrom: null, createdAt: new Date('2026-01-01') } as never,
      ]);

      const response = await request(app).get('/').query({ teamId: 1 });

      expect(response.status).toBe(200);
      expect(response.body[0]).toMatchObject({ id: 1 });
      expect(response.body[0].scheduledWage).toBeNull();
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
      vi.spyOn(prisma.wage, 'findUnique').mockResolvedValue({ teamId: 1 } as never);
      vi.spyOn(prisma.team, 'findUnique').mockResolvedValue({ isArchived: false } as never);
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
      vi.spyOn(prisma.wage, 'findUnique').mockResolvedValue(null);
      vi.spyOn(prisma.wage, 'findFirst').mockResolvedValue(null);

      const response = await request(app).put('/1').query({ action: 'disable' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Missing or invalid teamId at params.wageId');
    });

    it('should return 403 if caller is not the owner of the team', async () => {
      vi.spyOn(prisma.wage, 'findUnique').mockResolvedValue({ teamId: 1 } as never);
      vi.spyOn(prisma.wage, 'findFirst').mockResolvedValue({
        ...mockWage,
        team: { ownerAddress: '0x0000000000000000000000000000000000000000' },
      } as unknown as Wage);

      const response = await request(app).put('/1').query({ action: 'disable' });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Caller is not the owner of the team');
    });

    it('should disable a wage', async () => {
      vi.spyOn(prisma.wage, 'findFirst').mockResolvedValue({
        ...mockWage,
        team: { ownerAddress: mockTeam.ownerAddress },
      } as unknown as Wage);
      vi.spyOn(prisma.wage, 'update').mockResolvedValue({ ...mockWage, disabled: true } as Wage);

      const response = await request(app).put('/1').query({ action: 'disable' });

      expect(response.status).toBe(200);
      expect(response.body.disabled).toBe(true);
      expect(prisma.wage.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { disabled: true } })
      );
    });

    it('should enable a wage', async () => {
      vi.spyOn(prisma.wage, 'findFirst').mockResolvedValue({
        ...mockWage,
        disabled: true,
        team: { ownerAddress: mockTeam.ownerAddress },
      } as unknown as Wage);
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
