import { User } from '@prisma/client';
import express from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  {
    body: {
      message: createSiweMessage('0x70997970C51812dc3A010C7d01b50e0d17dc79C8'),
      signature: VALID_SIGNATURE,
    },
    description: 'SIWE verification fails',
    expectedStatus: 401,
    expectedMessage: 'Signature does not match address of the message.',
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
  });

  describe('POST: /siwe', () => {
    // Parameterized tests for invalid scenarios
    invalidSiweScenarios.forEach(({ body, description, expectedStatus, expectedMessage }) => {
      it(`should return ${expectedStatus} if ${description}`, async () => {
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

    it('should return 200 if authentication successful with existing user', async () => {
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
    });

    it('should return 200 if authentication successful with new user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.update.mockResolvedValue({
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

    it('should return 400 if internal server error occurs', async () => {
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
      it(`should return 401 if ${description}`, async () => {
        const response = await request(app).get('/token').set(headers);

        expect(response.status).toBe(401);
        if (expectedMessage) {
          expect(response.body).toEqual({ message: expectedMessage });
        }
      });
    });

    it('should return 200 if authorization successful', async () => {
      // Create a valid JWT token for testing
      const testToken = jwt.sign(
        { address: TEST_ADDRESS },
        process.env.SECRET_KEY || 'test-secret-key'
      );

      const response = await request(app).get('/token').set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
    });
  });
});
