import { User } from '@prisma/client';
import express from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authenticateToken } from '../authController';
import authRoutes from '../../routes/authRoutes';

// Hoisted mock variables for consistent mocking
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock prisma with hoisted variables
vi.mock('../../utils', async () => {
  const actual = await vi.importActual('../../utils');
  return {
    ...actual,
    prisma: mockPrisma,
  };
});

vi.mock('../../utils/dependenciesUtil', async () => {
  const actual = await vi.importActual('../../utils/dependenciesUtil');
  return {
    ...actual,
    prisma: mockPrisma,
  };
});

// Set up test environment variables
process.env.SECRET_KEY = 'test-secret-key-for-testing';

const app = express();
app.use(express.json());
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use(limiter);
app.use('/', authRoutes);

// Test constants
const TEST_ADDRESS = '0x1234567890123456789012345678901234567890';
const VALID_NONCE = 'BuEqovAcm4cRvRHlx';

// Mock factory for cleaner test data
const createMockUser = (overrides: Partial<User> = {}): User => ({
  name: 'Mock User',
  address: TEST_ADDRESS,
  nonce: '',
  imageUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Test message templates
const createSiweMessage = (
  address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  nonce = VALID_NONCE
) =>
  `localhost:5173 wants you to sign in with your Ethereum account:\n${address}\n\nSign in with Ethereum to the app.\n\nURI: http://localhost:5173\nVersion: 1\nChain ID: 1\nNonce: ${nonce}\nIssued At: 2024-12-18T11:57:47.715Z`;

const VALID_SIGNATURE =
  '0x162ef821f3a9fbd0d38fcad0d6f19014d031767944fe8d686166f08ce4328eda3eace9c0d57fbb0fcdb276005a3429ed54e75f67f1b0049f55ba71b646775f9f1b';

// Common test scenarios for parameterized tests
const invalidSiweScenarios = [
  {
    body: {},
    description: 'message and signature not set',
    expectedStatus: 400,
    expectedMessage: 'Invalid request body',
  },
  {
    body: { message: createSiweMessage() },
    description: 'signature not set',
    expectedStatus: 400,
    expectedMessage: 'Invalid request body',
  },
];

const invalidTokenScenarios = [
  {
    headers: {},
    description: 'missing authorization header',
    expectedMessage: 'Unauthorized: Missing authorization header',
  },
  {
    headers: { Authorization: 'Bearer invalid-token' },
    description: 'invalid token format',
    // Status 401 but no specific message check needed
  },
  {
    headers: {
      Authorization: `Bearer ${jwt.sign({}, process.env.SECRET_KEY || 'test-secret-key')}`,
    },
    description: 'missing jwt payload address',
    expectedMessage: 'Unauthorized: Missing jwt payload',
  },
];

describe('authController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PROFILE_AVATAR_MODE;
  });

  describe('POST: /siwe', () => {
    // Parameterized tests for invalid scenarios
    invalidSiweScenarios.forEach(({ body, description, expectedStatus, expectedMessage }) => {
      it(`returns ${expectedStatus} if ${description}`, async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null);

        const response = await request(app).post('/siwe').send(body);

        expect(response.status).toBe(expectedStatus);
        if (expectedMessage) {
          if (expectedStatus === 400) {
            expect(response.body.message).toContain(expectedMessage);
          } else {
            expect(response.body).toEqual({ message: expectedMessage });
          }
        }
      });
    });

    it('[AC-US-AUTH-001-06] rotates the nonce and issues a 24-hour JWT for an existing user', async () => {
      const mockUser = createMockUser();
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        nonce: '123abc',
      });

      const response = await request(app).post('/siwe').send({
        message: createSiweMessage(),
        signature: VALID_SIGNATURE,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(typeof response.body.accessToken).toBe('string');

      const updateCall = mockPrisma.user.update.mock.calls[0]?.[0] as
        | { where?: { address?: string }; data?: { nonce?: string } }
        | undefined;
      expect(updateCall).toEqual({
        where: { address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' },
        data: { nonce: expect.any(String) },
      });
      expect(updateCall?.data?.nonce).not.toBe(mockUser.nonce);
      expect(updateCall?.data?.nonce).not.toBe(VALID_NONCE);

      const payload = jwt.decode(response.body.accessToken) as { iat: number; exp: number };
      expect(payload.exp - payload.iat).toBe(24 * 60 * 60);
    });

    it('[AC-US-AUTH-001-05] rejects a SIWE message with a stale nonce', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ nonce: 'different-nonce' }));

      const response = await request(app).post('/siwe').send({
        message: createSiweMessage(),
        signature: VALID_SIGNATURE,
      });

      expect(response.status).toBe(401);
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('[AC-US-AUTH-001-09] rejects a mismatched SIWE signature without authenticating the user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/siwe')
        .send({
          message: createSiweMessage('0x70997970C51812dc3A010C7d01b50e0d17dc79C8'),
          signature: VALID_SIGNATURE,
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        message: 'Signature does not match address of the message.',
      });
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('[AC-US-AUTH-001-02] authenticates and creates a new user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        ...createMockUser(),
        nonce: '123abc',
      });

      const response = await request(app).post('/siwe').send({
        message: createSiweMessage(),
        signature: VALID_SIGNATURE,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(typeof response.body.accessToken).toBe('string');
    });

    it('creates new user without avatar when PROFILE_AVATAR_MODE is none', async () => {
      process.env.PROFILE_AVATAR_MODE = 'none';
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        ...createMockUser(),
        nonce: '123abc',
      });

      const response = await request(app).post('/siwe').send({
        message: createSiweMessage(),
        signature: VALID_SIGNATURE,
      });

      expect(response.status).toBe(200);
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ imageUrl: null }),
        })
      );
    });

    it('reports an unexpected authentication persistence failure', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('db crash'));

      const response = await request(app).post('/siwe').send({
        message: createSiweMessage(),
        signature: VALID_SIGNATURE,
      });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error has occured');
    });

    it('rejects malformed authentication input', async () => {
      const response = await request(app).post('/siwe').send({
        message: 'Test message',
        signature: '0xSignature',
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid request body');
    });
  });

  describe('GET: /token', () => {
    // Parameterized tests for invalid token scenarios
    invalidTokenScenarios.forEach(({ headers, description, expectedMessage }) => {
      it(`returns 401 if ${description}`, async () => {
        const response = await request(app).get('/token').set(headers);

        expect(response.status).toBe(401);
        if (expectedMessage) {
          expect(response.body).toEqual({ message: expectedMessage });
        }
      });
    });

    it('returns 200 if authorization successful', async () => {
      // Create a valid JWT token for testing
      const testToken = jwt.sign(
        { address: TEST_ADDRESS },
        process.env.SECRET_KEY || 'test-secret-key'
      );
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser());

      const response = await request(app).get('/token').set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('authenticateToken (unit)', () => {
    it('returns 401 when request has no address payload', () => {
      const json = vi.fn();
      const res = { status: vi.fn().mockReturnValue({ json }) } as unknown as express.Response;
      const req = {} as express.Request;

      authenticateToken(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(json).toHaveBeenCalledWith({ message: 'Unauthorized: Missing jwt payload' });
    });

    it('returns 200 when request contains address payload', () => {
      const json = vi.fn();
      const res = { status: vi.fn().mockReturnValue({ json }) } as unknown as express.Response;
      const req = { address: TEST_ADDRESS } as unknown as express.Request;

      authenticateToken(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(json).toHaveBeenCalledWith({});
    });
  });
});
