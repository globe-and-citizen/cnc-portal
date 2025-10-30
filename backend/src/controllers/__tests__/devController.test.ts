import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { generateSiweSignature, devHealthCheck } from '../devController';
import server from '../../config/serverConfig';

// Mock Sentry to prevent initialization errors in tests
vi.mock('@sentry/node', () => ({
  default: {
    init: vi.fn(),
  },
}));

// Hoisted mock variables for consistent mocking
const { mockPrivateKeyToAccount, mockSiweMessage } = vi.hoisted(() => ({
  mockPrivateKeyToAccount: vi.fn(),
  mockSiweMessage: vi.fn(),
}));

// Mock dependencies with hoisted variables
vi.mock('viem/accounts', () => ({
  privateKeyToAccount: mockPrivateKeyToAccount,
}));

vi.mock('siwe', () => ({
  SiweMessage: mockSiweMessage,
}));

// Test constants
const TEST_ADDRESS = '0x1234567890123456789012345678901234567890' as const;
const VALID_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234' as const;
const TEST_NONCE = '32891756';

// Mock factory for cleaner test data
const createValidMessageParams = (overrides: any = {}) => ({
  nonce: TEST_NONCE,
  address: TEST_ADDRESS,
  domain: 'localhost',
  chainId: 1337,
  statement: 'Test statement',
  uri: 'http://localhost:3000',
  ...overrides,
});

// Common test scenarios for parameterized tests
const invalidRequestScenarios = [
  {
    body: { privateKey: VALID_PRIVATE_KEY },
    description: 'messageParams is missing',
    expectedError: 'Missing messageParams in request body'
  },
  {
    body: { messageParams: createValidMessageParams() },
    description: 'privateKey is missing',
    expectedError: 'Missing privateKey in request body'
  },
  {
    body: {
      messageParams: { nonce: '123' }, // missing required fields
      privateKey: VALID_PRIVATE_KEY
    },
    description: 'required messageParams fields are missing',
    expectedError: 'Missing required fields in messageParams: nonce, address, domain, chainId'
  },
  {
    body: {
      messageParams: createValidMessageParams(),
      privateKey: '1234567890123456789012345678901234567890123456789012345678901234' // missing 0x prefix
    },
    description: 'private key format is invalid',
    expectedError: 'Private key must start with 0x'
  },
  {
    body: {
      messageParams: createValidMessageParams({ address: 'invalid-address' }),
      privateKey: VALID_PRIVATE_KEY
    },
    description: 'address format is invalid',
    expectedError: 'Invalid Ethereum address format'
  },
];

const environmentScenarios = [
  {
    nodeEnv: 'development',
    shouldAllow: true,
    description: 'development mode'
  },
  {
    nodeEnv: 'production',
    shouldAllow: false,
    description: 'production mode'
  },
  {
    nodeEnv: 'test',
    shouldAllow: false,
    description: 'test mode'
  },
];

describe('DevController', () => {
  let app: Express;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    app = server.getApp();
    originalNodeEnv = process.env.NODE_ENV;
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('GET: /api/dev/health', () => {
    // Parameterized tests for different environments
    environmentScenarios.forEach(({ nodeEnv, shouldAllow, description }) => {
      it(`should return ${shouldAllow ? '200' : '403'} when in ${description}`, async () => {
        process.env.NODE_ENV = nodeEnv;

        const expectedStatus = shouldAllow ? 200 : 403;
        const response = await request(app).get('/api/dev/health').expect(expectedStatus);

        if (shouldAllow) {
          expect(response.body).toMatchObject({
            success: true,
            message: 'Dev controller is available',
            environment: nodeEnv,
          });
          expect(response.body.timestamp).toBeDefined();
        } else {
          expect(response.body).toMatchObject({
            success: false,
            error: 'Development endpoints are only available in development mode',
            environment: nodeEnv,
          });
        }
      });
    });
  });

  describe('POST: /api/dev/generate-siwe-signature', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    // Parameterized tests for environment restrictions
    environmentScenarios
      .filter(({ nodeEnv }) => nodeEnv !== 'development')
      .forEach(({ nodeEnv, description }) => {
        it(`should return 403 when in ${description}`, async () => {
          process.env.NODE_ENV = nodeEnv;

          const requestBody = {
            messageParams: createValidMessageParams(),
            privateKey: VALID_PRIVATE_KEY,
          };

          const response = await request(app)
            .post('/api/dev/generate-siwe-signature')
            .send(requestBody)
            .expect(403);

          expect(response.body.error).toBe(
            'Development endpoints are only available in development mode'
          );
        });
      });

    // Parameterized tests for invalid requests
    invalidRequestScenarios.forEach(({ body, description, expectedError }) => {
      it(`should return 400 when ${description}`, async () => {
        const response = await request(app)
          .post('/api/dev/generate-siwe-signature')
          .send(body)
          .expect(400);

        expect(response.body.error).toBe(expectedError);
      });
    });

    it('should generate signature successfully with valid input', async () => {
      // Setup mocks for successful case
      const mockAccount = { address: TEST_ADDRESS };
      const mockMessage = 'test-siwe-message';
      const mockSignature = '0xmocksignature';

      mockPrivateKeyToAccount.mockReturnValue(mockAccount);
      
      const mockSiweInstance = {
        prepareMessage: vi.fn().mockReturnValue(mockMessage),
        signMessage: vi.fn().mockResolvedValue(mockSignature),
      };
      mockSiweMessage.mockReturnValue(mockSiweInstance);

      const requestBody = {
        messageParams: createValidMessageParams(),
        privateKey: VALID_PRIVATE_KEY,
      };

      const response = await request(app)
        .post('/api/dev/generate-siwe-signature')
        .send(requestBody)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: mockMessage,
        signature: mockSignature,
      });

      // Verify mocks were called correctly
      expect(mockPrivateKeyToAccount).toHaveBeenCalledWith({
        privateKey: VALID_PRIVATE_KEY,
      });
      expect(mockSiweMessage).toHaveBeenCalledWith(
        expect.objectContaining(createValidMessageParams())
      );
      expect(mockSiweInstance.prepareMessage).toHaveBeenCalled();
      expect(mockSiweInstance.signMessage).toHaveBeenCalledWith(mockAccount);
    });

    it('should handle signature generation errors gracefully', async () => {
      // Setup mocks to simulate error
      const mockAccount = { address: TEST_ADDRESS };
      mockPrivateKeyToAccount.mockReturnValue(mockAccount);
      
      const mockSiweInstance = {
        prepareMessage: vi.fn().mockReturnValue('test-message'),
        signMessage: vi.fn().mockRejectedValue(new Error('Signature failed')),
      };
      mockSiweMessage.mockReturnValue(mockSiweInstance);

      const requestBody = {
        messageParams: createValidMessageParams(),
        privateKey: VALID_PRIVATE_KEY,
      };

      const response = await request(app)
        .post('/api/dev/generate-siwe-signature')
        .send(requestBody)
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to generate SIWE signature',
      });
    });
  });
});
