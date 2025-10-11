import request from 'supertest';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../../utils';
import jwt from 'jsonwebtoken';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import authRoutes from '../../routes/authRoutes';
import { User } from '@prisma/client';

// Mock prisma
vi.mock('../../utils', async () => {
  const actual = await vi.importActual('../../utils');
  return {
    ...actual,
    prisma: {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    },
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

const mockUser: User = {
  name: 'Mock User',
  address: '0x1234567890123456789012345678901234567890',
  nonce: '',
  imageUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('authController', () => {
  describe('POST: /siwe', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return 401 if message not set', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      const response = await request(app).post('/siwe');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        message: 'Auth error: Missing message',
      });
    });

    it('should return 401 if signature not set', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      const response = await request(app).post('/siwe').send({
        message: `A message`,
      });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        message: 'Auth error: Missing signature',
      });
    });

    it('should return 401 if SIWE verification fails', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      vi.spyOn(prisma.user, 'update').mockResolvedValue({
        ...mockUser,
        nonce: '123abc',
        imageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.spyOn(prisma.user, 'create');

      const response = await request(app).post('/siwe').send({
        message: `localhost:5173 wants you to sign in with your Ethereum account:\n0x70997970C51812dc3A010C7d01b50e0d17dc79C8\n\nSign in with Ethereum to the app.\n\nURI: http://localhost:5173\nVersion: 1\nChain ID: 1\nNonce: BuEqovAcm4cRvRHlx\nIssued At: 2024-12-18T11:57:47.715Z`,
        signature:
          '0x162ef821f3a9fbd0d38fcad0d6f19014d031767944fe8d686166f08ce4328eda3eace9c0d57fbb0fcdb276005a3429ed54e75f67f1b0049f55ba71b646775f9f1b',
      });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        message: 'Signature does not match address of the message.',
      });
    });

    it('should return 200 if authentication successful', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);
      vi.spyOn(prisma.user, 'update').mockResolvedValue({
        ...mockUser,
        nonce: '123abc',
        imageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.spyOn(prisma.user, 'create');

      const response = await request(app).post('/siwe').send({
        message: `localhost:5173 wants you to sign in with your Ethereum account:\n0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266\n\nSign in with Ethereum to the app.\n\nURI: http://localhost:5173\nVersion: 1\nChain ID: 1\nNonce: BuEqovAcm4cRvRHlx\nIssued At: 2024-12-18T11:57:47.715Z`,
        signature:
          '0x162ef821f3a9fbd0d38fcad0d6f19014d031767944fe8d686166f08ce4328eda3eace9c0d57fbb0fcdb276005a3429ed54e75f67f1b0049f55ba71b646775f9f1b',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(typeof response.body.accessToken).toBe('string');
    });

    it('should return 200 if authentication successful', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      vi.spyOn(prisma.user, 'update').mockResolvedValue({
        ...mockUser,
        nonce: '123abc',
        imageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.spyOn(prisma.user, 'create');

      const response = await request(app).post('/siwe').send({
        message: `localhost:5173 wants you to sign in with your Ethereum account:\n0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266\n\nSign in with Ethereum to the app.\n\nURI: http://localhost:5173\nVersion: 1\nChain ID: 1\nNonce: BuEqovAcm4cRvRHlx\nIssued At: 2024-12-18T11:57:47.715Z`,
        signature:
          '0x162ef821f3a9fbd0d38fcad0d6f19014d031767944fe8d686166f08ce4328eda3eace9c0d57fbb0fcdb276005a3429ed54e75f67f1b0049f55ba71b646775f9f1b',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(typeof response.body.accessToken).toBe('string');
    });

    it('It should return 500 if internal server error occurs', async () => {
      const response = await request(app).post('/siwe').send({
        message: `Test message`,
        signature: `0xSignature`,
      });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Extract address error: Eth address missing ',
        message: 'Internal server error has occured',
      });
    });
  });

  describe('GET: /token', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return 401 if user not authorised', async () => {
      const response = await request(app).get('/token');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        message: 'Unauthorized: Missing authorization header',
      });
    });

    it('should return 401 if token is invalid', async () => {
      const response = await request(app)
        .get('/token')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should return 200 if authorization successful', async () => {
      // Create a valid JWT token for testing
      const testAddress = '0x1234567890123456789012345678901234567890';
      const testToken = jwt.sign(
        { address: testAddress },
        process.env.SECRET_KEY || 'test-secret-key'
      );

      const response = await request(app).get('/token').set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
    });
  });
});
