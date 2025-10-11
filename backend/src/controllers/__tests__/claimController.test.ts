import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import claimRoutes from '../../routes/claimRoute';
import { prisma } from '../../utils';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { Claim, Wage, WeeklyClaim } from '@prisma/client';
import dayjs from 'dayjs';

vi.mock('../../utils');
vi.mock('../../utils/viem.config');

// Mock the cash remuneration utility
vi.mock('../../utils/cashRemunerationUtil', () => ({
  isCashRemunerationOwner: vi.fn(),
  getCashRemunerationOwner: vi.fn(),
}));

// Mock the wage controller
vi.mock('../wageController', () => ({
  isUserMemberOfTeam: vi.fn(),
}));

// Mock the authorization middleware with proper hoisting
vi.mock('../../middleware/authMiddleware', () => ({
  authorizeUser: vi.fn((req: Request, res: Response, next: NextFunction) => {
    (req as any).address = TEST_ADDRESS;
    next();
  }),
}));

// Import the mocked functions after mocking
import { isCashRemunerationOwner } from '../../utils/cashRemunerationUtil';
import { isUserMemberOfTeam } from '../wageController';

// Test constants
const TEST_ADDRESS = '0x1234567890123456789012345678901234567890';
const OTHER_ADDRESS = '0x456';

// Mock factories for cleaner test data
const createMockWage = (overrides: Partial<Wage> = {}): Wage =>
  ({
    id: 1,
    teamId: 1,
    userAddress: TEST_ADDRESS,

    ratePerHour: JSON.stringify([{ type: 'cash', amount: 50 }]),
    cashRatePerHour: 50,
    tokenRatePerHour: 0,
    usdcRatePerHour: 0,
    maximumHoursPerWeek: 40,
    nextWageId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Wage;

const createMockWeeklyClaim = (overrides: Partial<WeeklyClaim> = {}): WeeklyClaim =>
  ({
    id: 1,
    teamId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    weekStart: new Date(),
    data: {},
    memberAddress: TEST_ADDRESS,
    signature: null,
    claims: [{ hoursWorked: 30 }],
    wageId: 1,

    status: 'pending',
    ...overrides,
  }) as WeeklyClaim;

const createMockClaim = (overrides: Partial<Claim> = {}): Claim =>
  ({
    id: 123,
    hoursWorked: 5,

    memo: 'test memo',
    wageId: 1,
    status: 'pending',
    weeklyClaimId: 1,
    dayWorked: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    signature: null,
    tokenTx: null,
    ...overrides,
  }) as Claim;

const createMockClaimWithWage = (
  claimOverrides: Partial<Claim> = {},
  wageOverrides: Partial<Wage> = {}
) => [
  {
    id: 1,
    hoursWorked: 5,

    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
    signature: null,
    wageId: 1,
    dayWorked: new Date(),

    memo: 'Test memo',
    tokenTx: null,
    weeklyClaimId: 1,
    wage: {
      teamId: 1,
      userAddress: TEST_ADDRESS,

      user: { address: TEST_ADDRESS, name: 'User1' },
      ...wageOverrides,
    },
    ...claimOverrides,
  } as Claim,
];

// Test utilities
const mockIsCashRemunerationOwner = vi.mocked(isCashRemunerationOwner);
const mockIsUserMemberOfTeam = vi.mocked(isUserMemberOfTeam);

const app = express();
app.use(express.json());
app.use('/', claimRoutes);

const createTestApp = (address = TEST_ADDRESS) => {
  const testApp = express();
  testApp.use(express.json());
  testApp.use((req, res, next) => {
    (req as any).address = address;
    next();
  });
  testApp.use('/', claimRoutes);
  return testApp;
};

// Common test scenarios for parameterized tests
const invalidBodyScenarios = [
  { body: { teamId: 1, descpription: '' }, description: 'memo is missing' },
  { body: { teamId: 1, hoursWorked: 5, memo: ' ' }, description: 'memo is only spaces' },
  {
    body: { teamId: 1, hoursWorked: 5, memo: Array(201).fill('word').join(' ') },
    description: 'memo exceeds 200 words',
  },
  { body: {}, description: 'required fields are missing' },
  { body: { teamId: 1, hoursWorked: -5, memo: '' }, description: 'hoursWorked is invalid' },
];

const claimStatusTransitions = [
  {
    action: 'sign',
    fromStatus: 'pending',
    toStatus: 'signed',
    requiredAuth: 'cashOwnerOrTeamOwner',
  },
  { action: 'withdraw', fromStatus: 'signed', toStatus: 'withdrawn', requiredAuth: 'claimOwner' },
  {
    action: 'disable',
    fromStatus: 'signed',
    toStatus: 'disabled',
    requiredAuth: 'cashOwnerOrTeamOwner',
  },
  {
    action: 'enable',
    fromStatus: 'disabled',
    toStatus: 'enabled',
    requiredAuth: 'cashOwnerOrTeamOwner',
  },
  {
    action: 'reject',
    fromStatus: 'pending',
    toStatus: 'rejected',
    requiredAuth: 'cashOwnerOrTeamOwner',
  },
];

const invalidStatusTransitions = [
  { action: 'sign', fromStatus: 'signed', errorMsg: "Can't signe" },
  { action: 'withdraw', fromStatus: 'pending', errorMsg: "Can't withdraw" },
  { action: 'disable', fromStatus: 'pending', errorMsg: "Can't disable" },
  { action: 'enable', fromStatus: 'pending', errorMsg: "Can't enable" },
  { action: 'reject', fromStatus: 'signed', errorMsg: "Can't reject" },
];

describe('Claim Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST: /', () => {
    // Parameterized tests for invalid body scenarios
    invalidBodyScenarios.forEach(({ body, description }) => {
      it(`should return 400 if ${description}`, async () => {
        const response = await request(app).post('/').send(body);
        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Invalid request body');
      });
    });

    it("should return 400 if user doesn't have wage", async () => {
      vi.spyOn(prisma.wage, 'findFirst').mockResolvedValue(null);
      const response = await request(app)
        .post('/')
        .send({ teamId: 1, hoursWorked: 5, memo: 'memo' });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('No wage found for the user');
    });

    it('should return 400 if maximum weekly claim is reached', async () => {
      vi.spyOn(prisma.wage, 'findFirst').mockResolvedValue(createMockWage());
      vi.spyOn(prisma.weeklyClaim, 'findFirst').mockResolvedValue(createMockWeeklyClaim());

      const response = await request(app)
        .post('/')
        .send({ teamId: 1, hoursWorked: 45, memo: 'memo' });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(
        /^Maximum weekly hours reached, cannot submit more claims for this week\. You have \d+ hours remaining\.$/
      );
    });

    it('should return 400 if total hours exceed 24 hours for a single day', async () => {
      const testDate = dayjs.utc().startOf('day').toDate();
      const modifiedWeeklyClaims = createMockWeeklyClaim();
      // @ts-ignore - Mock data structure for testing
      modifiedWeeklyClaims.claims = [{ dayWorked: testDate, hoursWorked: 20 }];

      vi.spyOn(prisma.wage, 'findFirst').mockResolvedValue(createMockWage());
      vi.spyOn(prisma.weeklyClaim, 'findFirst').mockResolvedValue(modifiedWeeklyClaims);

      const response = await request(app).post('/').send({
        teamId: 1,
        hoursWorked: 5, // 5 + 20 = 25 hours > 24 hours
        memo: 'memo',
        dayWorked: testDate.toISOString(),
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        'Submission failed: the total number of hours for this day would exceed 24 hours.'
      );
    });

    it('should return 201 when creating a new weekly claim', async () => {
      const mockWage = createMockWage();
      const mockWeeklyClaims = createMockWeeklyClaim();
      const mockClaim = createMockClaim();

      vi.spyOn(prisma.wage, 'findFirst').mockResolvedValue(mockWage);
      vi.spyOn(prisma.weeklyClaim, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma.weeklyClaim, 'create').mockResolvedValue(mockWeeklyClaims);
      vi.spyOn(prisma.claim, 'create').mockResolvedValue(mockClaim);

      const response = await request(app)
        .post('/')
        .send({ teamId: 1, hoursWorked: 5, memo: 'test memo' });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: mockClaim.id,
        hoursWorked: mockClaim.hoursWorked,
        memo: mockClaim.memo,
        wageId: mockClaim.wageId,
        status: mockClaim.status,
        weeklyClaimId: mockClaim.weeklyClaimId,
      });
    });

    it('should return 201 when adding claim to existing weekly claim', async () => {
      const mockWage = createMockWage();
      const mockWeeklyClaims = createMockWeeklyClaim();
      const mockClaim = createMockClaim();

      vi.spyOn(prisma.wage, 'findFirst').mockResolvedValue(mockWage);
      vi.spyOn(prisma.weeklyClaim, 'findFirst').mockResolvedValue(mockWeeklyClaims);
      vi.spyOn(prisma.claim, 'create').mockResolvedValue(mockClaim);

      const response = await request(app)
        .post('/')
        .send({ teamId: 1, hoursWorked: 5, memo: 'test memo' });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: mockClaim.id,
        hoursWorked: mockClaim.hoursWorked,
        memo: mockClaim.memo,
        wageId: mockClaim.wageId,
        status: mockClaim.status,
        weeklyClaimId: mockClaim.weeklyClaimId,
      });
    });

    it('should return 500 if internal server error occurs', async () => {
      vi.spyOn(prisma.wage, 'findFirst').mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/')
        .send({ teamId: 1, hoursWorked: 5, memo: 'memo' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error has occured');
    });
  });

  describe('GET: /', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockIsUserMemberOfTeam.mockResolvedValue(true);
    });

    it('should return 400 if teamId is invalid', async () => {
      const response = await request(app).get('/').query({ teamId: 'abc' });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid query parameters');
    });

    it('should return 403 if caller is not a member of the team', async () => {
      mockIsUserMemberOfTeam.mockResolvedValue(false);
      const response = await request(app).get('/').query({ teamId: 1 });
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Caller is not a member of the team');
    });

    const successScenarios = [
      {
        description: 'list claims filtered by memberAddress',
        query: { teamId: 1, memberAddress: TEST_ADDRESS },
      },
      {
        description: 'list claims for a team',
        query: { teamId: 1 },
      },
      {
        description: 'list claims based on status filter',
        query: { teamId: 1, status: 'pending' },
      },
    ];

    successScenarios.forEach(({ description, query }) => {
      it(`should return 200 and ${description}`, async () => {
        const mockClaimWithWage = createMockClaimWithWage();

        vi.spyOn(prisma.claim, 'findMany').mockResolvedValue(mockClaimWithWage as any);

        const response = await request(app).get('/').query(query);

        expect(response.status).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
        expect(response.body[0]).toHaveProperty('id');
      });
    });

    it('should return 500 if an error occurs', async () => {
      mockIsUserMemberOfTeam.mockRejectedValue(new Error('Test error'));
      const response = await request(app).get('/').query({ teamId: 1 });
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error has occured');
    });
  });

  describe('PUT: /:claimId', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockIsCashRemunerationOwner.mockResolvedValue(false);
    });

    // Helper function to setup mock claim with authorization
    const setupMockClaim = (
      status = 'pending',
      userAddress = TEST_ADDRESS,
      teamOwnerAddress = TEST_ADDRESS
    ) => {
      return vi.spyOn(prisma.claim, 'findFirst').mockResolvedValue({
        id: 1,
        status,
        wage: {
          userAddress,
          team: { ownerAddress: teamOwnerAddress },
        },
      } as any);
    };

    // Helper function for authorization tests
    const testAuthorization = async (
      action: string,

      authType: 'cashOwnerOrTeamOwner' | 'claimOwner',
      shouldSucceed = true
    ) => {
      if (authType === 'cashOwnerOrTeamOwner') {
        mockIsCashRemunerationOwner.mockResolvedValue(shouldSucceed);
        setupMockClaim('pending', TEST_ADDRESS, shouldSucceed ? TEST_ADDRESS : OTHER_ADDRESS);
      } else {
        setupMockClaim('signed', shouldSucceed ? TEST_ADDRESS : OTHER_ADDRESS);
      }
    };

    it('should return 400 for invalid action', async () => {
      const response = await request(app).put('/1').query({ action: 'invalid' });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid query parameters');
    });

    it('should return 400 for missing signature', async () => {
      const response = await request(app).put('/1').query({ action: 'sign' });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Missing signature');
    });

    it('should return 404 if claim is not found', async () => {
      vi.spyOn(prisma.claim, 'findFirst').mockResolvedValue(null);
      const response = await request(app)
        .put('/1')
        .query({ action: 'sign' })
        .send({ signature: '0xabc' });
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Claim not found');
    });

    // Parameterized tests for authorization failures
    [
      {
        action: 'sign',
        authType: 'cashOwnerOrTeamOwner' as const,
        description: 'is not cash Remuneration owner or team owner',
      },
      {
        action: 'withdraw',
        authType: 'claimOwner' as const,
        description: 'is not the owner of the claim for withdraw action',
      },
    ].forEach(({ action, authType, description }) => {
      it(`should return 403 if caller ${description}`, async () => {
        await testAuthorization(action, authType, false);

        const requestBuilder = request(app).put('/1').query({ action });
        if (action === 'sign') requestBuilder.send({ signature: '0xabc' });

        const response = await requestBuilder;

        expect(response.status).toBe(403);
        expect(response.body.message).toBe(
          authType === 'cashOwnerOrTeamOwner'
            ? 'Caller is not the Cash Remuneration owner or the team owner'
            : 'Caller is not the owner of the claim'
        );
      });
    });

    // Parameterized tests for invalid status transitions
    invalidStatusTransitions.forEach(({ action, fromStatus, errorMsg }) => {
      it(`should return 403 if claim is not in valid state for ${action} action`, async () => {
        // For withdraw action, need to use the correct address to pass ownership check
        const userAddress = action === 'withdraw' ? TEST_ADDRESS : TEST_ADDRESS;
        setupMockClaim(fromStatus, userAddress);
        mockIsCashRemunerationOwner.mockResolvedValue(true);

        const testApp = action === 'withdraw' ? createTestApp() : app;
        const requestBuilder = request(testApp).put('/1').query({ action });
        if (action === 'sign') requestBuilder.send({ signature: '0xabc' });

        const response = await requestBuilder;

        expect(response.status).toBe(403);
        expect(response.body.message).toContain(errorMsg);
      });
    });

    // Parameterized tests for successful status transitions
    claimStatusTransitions.forEach(({ action, fromStatus, toStatus, requiredAuth }) => {
      it(`should update claim status from ${fromStatus} to ${toStatus} for ${action} action`, async () => {
        setupMockClaim(fromStatus);

        if (requiredAuth === 'cashOwnerOrTeamOwner') {
          mockIsCashRemunerationOwner.mockResolvedValue(true);
        }

        vi.spyOn(prisma.claim, 'update').mockResolvedValue({ id: 1, status: toStatus } as any);

        const testApp = requiredAuth === 'claimOwner' ? createTestApp() : app;
        const requestBuilder = request(testApp).put('/1').query({ action });
        if (action === 'sign') requestBuilder.send({ signature: '0xabc' });

        const response = await requestBuilder;

        expect(response.status).toBe(200);
        expect(response.body.status).toBe(toStatus);
      });
    });

    it('should return 500 if an error occurs', async () => {
      vi.spyOn(prisma.claim, 'findFirst').mockRejectedValue('Test');
      const response = await request(app)
        .put('/1')
        .query({ action: 'sign' })
        .send({ signature: '0xabc' });
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error has occured');
    });
  });
});
