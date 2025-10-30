import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { generateSiweSignature, devHealthCheck } from '../devController';
import server from '../../config/serverConfig';

// Mock dependencies at the top level
vi.mock('viem/accounts', () => ({
  privateKeyToAccount: vi.fn(),
}));

vi.mock('siwe', () => ({
  SiweMessage: vi.fn(),
}));

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

  describe('devHealthCheck', () => {
    it('should return success when in development mode', async () => {
      process.env.NODE_ENV = 'development';

      const response = await request(app).get('/api/dev/health').expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Dev controller is available',
        environment: 'development',
      });
      expect(response.body.timestamp).toBeDefined();
    });

    it('should return 403 when not in development mode', async () => {
      process.env.NODE_ENV = 'production';

      const response = await request(app).get('/api/dev/health').expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Development endpoints are only available in development mode',
        environment: 'production',
      });
    });
  });

  describe('generateSiweSignature', () => {
    const validMessageParams = {
      nonce: '32891756',
      address: '0x1234567890123456789012345678901234567890' as const,
      domain: 'localhost',
      chainId: 1337,
      statement: 'Test statement',
      uri: 'http://localhost:3000',
    };

    const validPrivateKey =
      '0x1234567890123456789012345678901234567890123456789012345678901234' as const;

    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should return 403 when not in development mode', async () => {
      process.env.NODE_ENV = 'production';

      const requestBody = {
        messageParams: validMessageParams,
        privateKey: validPrivateKey,
      };

      const response = await request(app)
        .post('/api/dev/generate-siwe-signature')
        .send(requestBody)
        .expect(403);

      expect(response.body.error).toBe(
        'Development endpoints are only available in development mode'
      );
    });

    it('should return 400 when messageParams is missing', async () => {
      const requestBody = {
        privateKey: validPrivateKey,
      };

      const response = await request(app)
        .post('/api/dev/generate-siwe-signature')
        .send(requestBody)
        .expect(400);

      expect(response.body.error).toBe('Missing messageParams in request body');
    });

    it('should return 400 when privateKey is missing', async () => {
      const requestBody = {
        messageParams: validMessageParams,
      };

      const response = await request(app)
        .post('/api/dev/generate-siwe-signature')
        .send(requestBody)
        .expect(400);

      expect(response.body.error).toBe('Missing privateKey in request body');
    });

    it('should return 400 when required messageParams fields are missing', async () => {
      const incompleteParams = {
        nonce: '123',
        // missing address, domain, chainId
      };

      const requestBody = {
        messageParams: incompleteParams,
        privateKey: validPrivateKey,
      };

      const response = await request(app)
        .post('/api/dev/generate-siwe-signature')
        .send(requestBody)
        .expect(400);

      expect(response.body.error).toBe(
        'Missing required fields in messageParams: nonce, address, domain, chainId'
      );
    });

    it('should return 400 when private key format is invalid', async () => {
      const requestBody = {
        messageParams: validMessageParams,
        privateKey: '1234567890123456789012345678901234567890123456789012345678901234', // missing 0x prefix
      };

      const response = await request(app)
        .post('/api/dev/generate-siwe-signature')
        .send(requestBody)
        .expect(400);

      expect(response.body.error).toBe('Private key must start with 0x');
    });

    it('should return 400 when address format is invalid', async () => {
      const invalidParams = {
        ...validMessageParams,
        address: 'invalid-address' as const,
      };

      const requestBody = {
        messageParams: invalidParams,
        privateKey: validPrivateKey,
      };

      const response = await request(app)
        .post('/api/dev/generate-siwe-signature')
        .send(requestBody)
        .expect(400);

      expect(response.body.error).toBe('Invalid Ethereum address format');
    });
  });
});
