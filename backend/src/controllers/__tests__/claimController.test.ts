import { Claim, Wage, WeeklyClaim } from '@prisma/client';
import dayjs from 'dayjs';
import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import claimRoutes from '../../routes/claimRoute';
import { prisma } from '../../utils';

vi.mock('../../utils', async () => {
  const actual = await vi.importActual('../../utils');
  return {
    ...actual,
    prisma: {
      team: {
        findFirst: vi.fn().mockResolvedValue({ id: 1 }),
      },
      wage: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      weeklyClaim: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      claim: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
    },
  };
});
vi.mock('../../utils/viem.config');

// Mock the cash remuneration utility
vi.mock('../../utils/cashRemunerationUtil', () => ({
  isCashRemunerationOwner: vi.fn(),
  getCashRemunerationOwner: vi.fn(),
}));

// Mock the storage service
const { mockGetPublicFileUrl, mockDeleteFile } = vi.hoisted(() => ({
  mockGetPublicFileUrl: vi.fn((key: string) => `https://storage.railway.app/test-bucket/${key}`),
  mockDeleteFile: vi.fn(),
}));

vi.mock('../../services/storageService', () => ({
  getPublicFileUrl: mockGetPublicFileUrl,
  deleteFile: mockDeleteFile,
  refreshPresignedUrl: vi.fn((key: string) => `https://storage.railway.app/test-bucket/${key}`),
  isStorageConfigured: vi.fn(() => true),
  uploadFile: vi.fn(),
  uploadProfileImage: vi.fn(),
  fileExists: vi.fn(),
  validateFile: vi.fn(),
  ALLOWED_IMAGE_MIMETYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_MIMETYPES: [
    'application/pdf',
    'application/msword',
    'text/plain',
    'application/zip',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  ALLOWED_MIMETYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'text/plain',
    'application/zip',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  MAX_FILES_UPLOAD: 10,
  PRESIGNED_URL_EXPIRATION: 3600,
}));

const TEST_ADDRESS = '0x1234567890123456789012345678901234567890';

// Mock the authorization middleware with proper hoisting
vi.mock('../../middleware/authMiddleware', () => ({
  authorizeUser: vi.fn((req: Request & { address?: string }, res: Response, next: NextFunction) => {
    req.address = TEST_ADDRESS;
    next();
  }),
}));

// Import the mocked functions after mocking
import { isCashRemunerationOwner } from '../../utils/cashRemunerationUtil';

// Test constants

const OTHER_ADDRESS = '0x456';

// Mock factories for cleaner test data
const createMockWage = (overrides: Partial<Wage> = {}): Wage =>
  ({
    id: 1,
    teamId: 1,
    userAddress: TEST_ADDRESS,

    ratePerHour: JSON.stringify([{ type: 'cash', amount: 50 }]),
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
    claims: [{ hoursWorked: 1800 }],
    wageId: 1,

    status: 'pending',
    ...overrides,
  }) as WeeklyClaim;

const createMockClaim = (overrides: Partial<Claim> = {}): Claim =>
  ({
    id: 123,
    hoursWorked: 300,

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
    hoursWorked: 300,
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

const createTestApp = (address = TEST_ADDRESS) => {
  const testApp = express();
  testApp.use(express.json());
  testApp.use((req: Request & { address?: string }, res, next) => {
    req.address = address;
    next();
  });
  testApp.use('/', claimRoutes);
  return testApp;
};

const app = createTestApp();
app.use(express.json());
app.use('/', claimRoutes);

// Common test scenarios for parameterized tests
const invalidBodyScenarios = [
  { body: { teamId: 1, descpription: '' }, description: 'memo is missing' },
  { body: { teamId: 1, hoursWorked: 300, memo: ' ' }, description: 'memo is only spaces' },
  {
    body: { teamId: 1, hoursWorked: 300, memo: Array(3001).fill('word').join(' ') },
    description: 'memo exceeds 3000 words',
  },
  { body: {}, description: 'required fields are missing' },
  { body: { teamId: 1, hoursWorked: -5, memo: '' }, description: 'hoursWorked is invalid' },
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
        .send({ teamId: 1, hoursWorked: 300, memo: 'memo' });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('No wage found for the user');
    });

    it('should return 400 if total hours exceed 24 hours for a single day', async () => {
      const testDate = dayjs.utc().startOf('day').toDate();
      const modifiedWeeklyClaims = createMockWeeklyClaim();
      (modifiedWeeklyClaims as any).claims = [{ dayWorked: testDate, hoursWorked: 1200 }];

      vi.spyOn(prisma.wage, 'findFirst').mockResolvedValue(createMockWage());
      vi.spyOn(prisma.weeklyClaim, 'findFirst').mockResolvedValue(modifiedWeeklyClaims);

      const response = await request(app).post('/').send({
        teamId: 1,
        hoursWorked: 300, // 300 + 1200 = 1500 minutes > 1440 minutes (24h)
        memo: 'memo',
        dayWorked: testDate.toISOString(),
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        'Submission failed: the total number of hours for this day would exceed 24 hours (1440 minutes).'
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
        .send({ teamId: 1, hoursWorked: 300, memo: 'test memo' });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: mockClaim.id,
        hoursWorked: mockClaim.hoursWorked,
        memo: mockClaim.memo,
        wageId: mockClaim.wageId,
        weeklyClaimId: mockClaim.weeklyClaimId,
      });
    });

    it('should return 409 if the claim is already signed', async () => {
      const mockWage = createMockWage();
      const mockWeeklyClaims = createMockWeeklyClaim({ status: 'signed', signature: '0xabc' });
      vi.spyOn(prisma.wage, 'findFirst').mockResolvedValue(mockWage);
      vi.spyOn(prisma.weeklyClaim, 'findFirst').mockResolvedValue(mockWeeklyClaims);
      const response = await request(app)
        .post('/')
        .send({ teamId: 1, hoursWorked: 300, memo: 'test memo' });
      expect(response.status).toBe(409);
      expect(response.body.message).toBe('Week already signed. Submission not allowed.');
    });

    it('should return 409 if the claim is already disabled', async () => {
      const mockWage = createMockWage();
      const mockWeeklyClaims = createMockWeeklyClaim({ status: 'disabled' });
      vi.spyOn(prisma.wage, 'findFirst').mockResolvedValue(mockWage);
      vi.spyOn(prisma.weeklyClaim, 'findFirst').mockResolvedValue(mockWeeklyClaims);
      const response = await request(app)
        .post('/')
        .send({ teamId: 1, hoursWorked: 300, memo: 'test memo' });
      expect(response.status).toBe(409);
      expect(response.body.message).toBe('Week is disabled. Submission not allowed.');
    });

    it('should return 409 if the claim is already withdrawn', async () => {
      const mockWage = createMockWage();
      const mockWeeklyClaims = createMockWeeklyClaim({ status: 'withdrawn' });
      vi.spyOn(prisma.wage, 'findFirst').mockResolvedValue(mockWage);
      vi.spyOn(prisma.weeklyClaim, 'findFirst').mockResolvedValue(mockWeeklyClaims);
      const response = await request(app)
        .post('/')
        .send({ teamId: 1, hoursWorked: 300, memo: 'test memo' });
      expect(response.status).toBe(409);
      expect(response.body.message).toBe('Week already withdrawn. Submission not allowed.');
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
        .send({ teamId: 1, hoursWorked: 300, memo: 'test memo' });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: mockClaim.id,
        hoursWorked: mockClaim.hoursWorked,
        memo: mockClaim.memo,
        wageId: mockClaim.wageId,
        weeklyClaimId: mockClaim.weeklyClaimId,
      });
    });

    it('should return 500 if internal server error occurs', async () => {
      vi.spyOn(prisma.wage, 'findFirst').mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/')
        .send({ teamId: 1, hoursWorked: 300, memo: 'memo' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error has occured');
    });

    // File attachment tests for addClaim
    describe('File Attachments', () => {
      it('should create claim with file attachments', async () => {
        const mockWage = createMockWage();
        const mockWeeklyClaim = createMockWeeklyClaim();
        const mockClaim = createMockClaim({
          fileAttachments: [
            {
              fileType: 'application/pdf',
              fileSize: 1024,
              fileKey: 'claims/1/test-key',
              fileUrl: 'https://storage.railway.app/claims/1/test-key?signed',
            },
          ],
        });

        vi.spyOn(prisma.wage, 'findFirst').mockResolvedValue(mockWage);
        vi.spyOn(prisma.weeklyClaim, 'findFirst').mockResolvedValue(mockWeeklyClaim);
        const createSpy = vi.spyOn(prisma.claim, 'create').mockResolvedValue(mockClaim);

        const response = await request(app)
          .post('/')
          .send({
            teamId: '1',
            hoursWorked: '300',
            memo: 'test memo',
            attachments: [
              {
                fileKey: 'claims/1/test-key',
                fileUrl: 'https://storage.railway.app/claims/1/test-key?signed',
                fileType: 'application/pdf',
                fileSize: 1024,
              },
            ],
          });

        expect(response.status).toBe(201);
        expect(createSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              fileAttachments: expect.arrayContaining([
                expect.objectContaining({
                  fileKey: 'claims/1/test-key',
                }),
              ]),
            }),
          })
        );
      });
    });
  });

  describe('GET: /', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // requireTeamMember passes when prisma.team.findFirst returns a team
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue({ id: 1 } as any);
    });

    it('should return 400 if teamId is invalid', async () => {
      const response = await request(app).get('/').query({ teamId: 'abc' });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid query parameters');
    });

    it('should return 403 if caller is not a member of the team', async () => {
      vi.spyOn(prisma.team, 'findFirst').mockResolvedValue(null);
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
      vi.spyOn(prisma.team, 'findFirst').mockRejectedValue(new Error('Test error'));
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
    const setupMockClaim = (userAddress = TEST_ADDRESS, teamOwnerAddress = TEST_ADDRESS) => {
      return vi.spyOn(prisma.claim, 'findFirst').mockResolvedValue({
        id: 1,
        wage: {
          userAddress,
          team: { ownerAddress: teamOwnerAddress },
        },
        weeklyClaim: {
          status: 'pending',
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

        setupMockClaim('pending', shouldSucceed ? TEST_ADDRESS : OTHER_ADDRESS);
      } else {
        setupMockClaim('signed', shouldSucceed ? TEST_ADDRESS : OTHER_ADDRESS);
      }
    };

    it('should return 404 if claim is not found', async () => {
      vi.spyOn(prisma.claim, 'findFirst').mockResolvedValue(null);
      const response = await request(app)
        .put('/1')
        .query({})
        .send({ hoursWorked: 300, memo: 'Updated memo' });
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
        expect(response.body.message).toBe('Caller is not the owner of the claim');
      });
    });

    it('should return 409 if updating claim exceeds maximum weekly hours', async () => {
      const mockClaim = {
        id: 1,
        wage: { userAddress: TEST_ADDRESS, maximumHoursPerWeek: 40 },
        weeklyClaim: {
          status: 'pending',
          claims: [
            { id: 2, hoursWorked: 1800 },
            { id: 3, hoursWorked: 480 },
          ],
        },
        fileAttachments: null,
      };
      vi.spyOn(prisma.claim, 'findFirst').mockResolvedValue(mockClaim as any);

      const response = await request(app).put('/1').send({
        hoursWorked: 300,
        memo: 'Updated memo',
      });
      expect(response.status).toBe(409);
      expect(response.body.message).toContain(
        'Unable to update this claim: your weekly hours limit would be exceeded.'
      );
      expect(response.body.message).toContain('Weekly allowance: 40h regular + 0h overtime = 40h.');
      expect(response.body.message).toContain('Already submitted: 38h.');
      expect(response.body.message).toContain('Remaining to submit: 2h.');
      expect(response.body.message).toContain(
        'Unable to update this claim: your weekly hours limit would be exceeded. Weekly allowance: 40h regular + 0h overtime = 40h. Already submitted: 38h. Remaining to submit: 2h.'
      );
    });

    it('should update claim successfully with valid data', async () => {
      const mockClaim = {
        id: 1,
        wage: { userAddress: TEST_ADDRESS },
        weeklyClaim: { status: 'pending' },
        fileAttachments: null,
      };

      vi.spyOn(prisma.claim, 'findFirst').mockResolvedValue(mockClaim as any);
      vi.spyOn(prisma.claim, 'update').mockResolvedValue({
        id: 1,
        hoursWorked: 360,
        memo: 'Updated memo',
      } as any);

      const response = await request(app).put('/1').send({
        hoursWorked: 360,
        memo: 'Updated memo',
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: 1,
        hoursWorked: 360,
        memo: 'Updated memo',
      });
    });

    it('should update only provided fields', async () => {
      const mockClaim = {
        id: 1,
        wage: { userAddress: TEST_ADDRESS },
        weeklyClaim: { status: 'pending' },
        fileAttachments: null,
      };

      vi.spyOn(prisma.claim, 'findFirst').mockResolvedValue(mockClaim as any);
      const updateSpy = vi.spyOn(prisma.claim, 'update').mockResolvedValue({
        id: 1,
        hoursWorked: 360,
        memo: 'Original memo',
      } as any);

      const response = await request(app).put('/1').send({ hoursWorked: 360 });

      expect(response.status).toBe(200);
      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { hoursWorked: 360, fileAttachments: [] },
      });
    });

    it('should handle internal server error during update', async () => {
      const mockClaim = {
        id: 1,
        wage: { userAddress: TEST_ADDRESS },
        weeklyClaim: { status: 'pending' },
        fileAttachments: null,
      };

      vi.spyOn(prisma.claim, 'findFirst').mockResolvedValue(mockClaim as any);
      vi.spyOn(prisma.claim, 'update').mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .put('/1')
        .send({ hoursWorked: 360, memo: 'Updated memo' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error has occured');
    });

    it('should handle null weeklyClaim status', async () => {
      const mockClaim = {
        id: 1,
        wage: { userAddress: TEST_ADDRESS },
        weeklyClaim: null,
        fileAttachments: null,
      };

      vi.spyOn(prisma.claim, 'findFirst').mockResolvedValue(mockClaim as any);

      const response = await request(app)
        .put('/1')
        .send({ hoursWorked: 360, memo: 'Updated memo' });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Can't edit: Claim is not pending");
    });

    // File attachment tests
    describe('File Attachments', () => {
      it('should delete files and add new files in the same request', async () => {
        const existingAttachments = [
          {
            fileType: 'application/pdf',
            fileSize: 1024,
            fileKey: 'claims/1/file1-key',
            fileUrl: 'https://storage.railway.app/claims/1/file1-key?signed',
          },
          {
            fileType: 'image/jpeg',
            fileSize: 2048,
            fileKey: 'claims/1/file2-key',
            fileUrl: 'https://storage.railway.app/claims/1/file2-key?signed',
          },
        ];

        const mockClaim = {
          id: 1,
          wage: { userAddress: TEST_ADDRESS },
          weeklyClaim: { status: 'pending', claims: [], teamId: 1 },
          fileAttachments: existingAttachments,
        };

        vi.spyOn(prisma.claim, 'findFirst').mockResolvedValue(mockClaim as any);
        const updateSpy = vi.spyOn(prisma.claim, 'update').mockResolvedValue({
          id: 1,
          fileAttachments: [
            existingAttachments[1], // file2 remains
            {
              fileType: 'image/png',
              fileSize: 3072,
              fileKey: 'claims/1/newfile-key',
              fileUrl: 'https://storage.railway.app/claims/1/newfile-key?signed',
            },
          ],
        } as any);

        // Delete index 0 and add a new file
        const response = await request(app)
          .put('/1')
          .send({
            memo: 'Updated memo',
            deletedFileIndexes: [0],
            attachments: [
              {
                fileKey: 'claims/1/newfile-key',
                fileUrl: 'https://storage.railway.app/claims/1/newfile-key?signed',
                fileType: 'image/png',
                fileSize: 3072,
              },
            ],
          });

        expect(response.status).toBe(200);
        expect(updateSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 1 },
            data: expect.objectContaining({
              fileAttachments: expect.arrayContaining([
                expect.objectContaining({ fileKey: 'claims/1/file2-key' }),
                expect.objectContaining({ fileKey: 'claims/1/newfile-key' }),
              ]),
            }),
          })
        );
      });

      it('should handle out of bounds file indexes gracefully', async () => {
        const existingAttachments = [
          {
            fileType: 'application/pdf',
            fileSize: 1024,
            fileKey: 'claims/1/abc123.pdf',
            fileUrl: 'https://storage.railway.app/test-bucket/claims/1/abc123.pdf',
          },
        ];

        const mockClaim = {
          id: 1,
          wage: { userAddress: TEST_ADDRESS },
          weeklyClaim: { status: 'pending', claims: [] },
          fileAttachments: existingAttachments,
        };

        vi.spyOn(prisma.claim, 'findFirst').mockResolvedValue(mockClaim as any);
        const updateSpy = vi.spyOn(prisma.claim, 'update').mockResolvedValue({
          id: 1,
          fileAttachments: existingAttachments,
        } as any);

        // Try to delete index 99 which doesn't exist (but is valid per schema)
        const response = await request(app)
          .put('/1')
          .send({
            deletedFileIndexes: [99],
            memo: 'Updated memo',
          });

        expect(response.status).toBe(200);
        // File should remain unchanged as indexes are out of bounds
        expect(updateSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 1 },
            data: expect.objectContaining({
              fileAttachments: existingAttachments,
            }),
          })
        );
      });
    });
  });

  describe('DELETE: /:claimId', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    const setupMockClaim = (
      status = 'pending',
      userAddress = TEST_ADDRESS,
      hasOtherClaims = false
    ) => {
      return vi.spyOn(prisma.claim, 'findFirst').mockResolvedValue({
        id: 1,
        wage: { userAddress: userAddress },
        weeklyClaim: {
          id: 1,
          status,
          claims: hasOtherClaims ? [{ id: 1 }, { id: 2 }] : [{ id: 1 }],
        },
      } as any);
    };

    it('should return 404 if claim is not found', async () => {
      vi.spyOn(prisma.claim, 'findFirst').mockResolvedValue(null);

      const response = await request(app).delete('/1');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Claim not found');
    });

    it('should return 403 if claim status is not pending or disabled', async () => {
      setupMockClaim('signed', TEST_ADDRESS);

      const response = await request(app).delete('/1');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Can't delete: Claim is not pending or disabled");
    });

    it('should return 403 if caller is not claim owner', async () => {
      setupMockClaim('pending', OTHER_ADDRESS);

      const response = await request(app).delete('/1');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Caller is not the owner of the claim');
    });

    it('should delete claim and weekly claim when no other claims exist', async () => {
      setupMockClaim('pending', TEST_ADDRESS, false);
      const mockClaimDelete = vi.spyOn(prisma.claim, 'delete').mockResolvedValue({} as any);
      const mockWeeklyClaimDelete = vi
        .spyOn(prisma.weeklyClaim, 'delete')
        .mockResolvedValue({} as any);

      const response = await request(app).delete('/1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Claim deleted successfully');
      expect(mockClaimDelete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockWeeklyClaimDelete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should only delete claim when other claims exist in weekly claim', async () => {
      setupMockClaim('pending', TEST_ADDRESS, true);
      const mockClaimDelete = vi.spyOn(prisma.claim, 'delete').mockResolvedValue({} as any);
      const mockWeeklyClaimDelete = vi.spyOn(prisma.weeklyClaim, 'delete');

      const response = await request(app).delete('/1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Claim deleted successfully');
      expect(mockClaimDelete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockWeeklyClaimDelete).not.toHaveBeenCalled();
    });

    it('should allow deletion of disabled claims', async () => {
      setupMockClaim('disabled');
      vi.spyOn(prisma.claim, 'delete').mockResolvedValue({} as any);

      const response = await request(app).delete('/1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Claim deleted successfully');
    });

    it('should return 500 if an error occurs', async () => {
      vi.spyOn(prisma.claim, 'findFirst').mockRejectedValue(new Error('DB error'));

      const response = await request(app).delete('/1');

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error has occured');
    });
  });
});
