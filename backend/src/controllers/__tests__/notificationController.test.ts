import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { prisma, errorResponse } from '../../utils';
import { Request, Response } from 'express';
import express, { NextFunction } from 'express';
import { authorizeUser } from '../../middleware/authMiddleware';
import notificationRoute from '../../routes/notificationRoute';
import { getNotification, updateNotification } from '../notificationController';

// Mock the authorizeUser middleware
vi.mock('../../middleware/authMiddleware', () => ({
  authorizeUser: vi.fn((req: Request, res: Response, next: NextFunction) => {
    (req as any).address = '0x1234567890123456789012345678901234567890';
    next();
  }),
}));

// Mock prisma
vi.mock('../../utils', async () => {
  const actual = await vi.importActual('../../utils');
  return {
    ...actual,
    prisma: {
      notification: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        createMany: vi.fn(),
      },
      $disconnect: vi.fn(),
    },
    addNotification: vi.fn(),
  };
});

const app = express();
app.use(express.json());
app.use('/', notificationRoute);

const mockNotification = {
  id: 1,
  userAddress: '0x1234567890123456789012345678901234567890',
  isRead: false,
  message: 'Test notification',
  subject: 'Test subject',
  author: '0x1111111111111111111111111111111111111111',
  createdAt: new Date(),
  updatedAt: new Date(),
  resource: null,
};

describe('Notification Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /', () => {
    it('should return notifications for authorized user', async () => {
      vi.spyOn(prisma.notification, 'findMany').mockResolvedValue([mockNotification]);

      const response = await request(app).get('/');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        id: mockNotification.id,
        userAddress: mockNotification.userAddress,
        isRead: mockNotification.isRead,
        message: mockNotification.message,
        subject: mockNotification.subject,
        author: mockNotification.author,
        resource: mockNotification.resource,
      });
    });

    it('should return empty array when no notifications found', async () => {
      vi.spyOn(prisma.notification, 'findMany').mockResolvedValue([]);

      const response = await request(app).get('/');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should return 403 if user is not authorized', async () => {
      const unauthorizedNotification = {
        ...mockNotification,
        userAddress: '0x9999999999999999999999999999999999999999',
      };
      // Use findMany instead of findUnique since getNotification uses findMany
      vi.spyOn(prisma.notification, 'findMany').mockResolvedValue([unauthorizedNotification]);

      const response = await request(app).get('/');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Unauthorized access');
    });

    it('should return 500 on server error', async () => {
      vi.spyOn(prisma.notification, 'findMany').mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/');

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error has occured');
    });
  });

  describe('PUT /:id', () => {
    it('should update notification successfully', async () => {
      vi.spyOn(prisma.notification, 'findUnique').mockResolvedValue(mockNotification);
      vi.spyOn(prisma.notification, 'update').mockResolvedValue({
        ...mockNotification,
        isRead: true,
      });

      const response = await request(app).put('/1');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isRead: true },
      });
    });

    it('should return 400 for invalid notification ID', async () => {
      const response = await request(app).put('/invalid');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Notification ID invalid format');
    });

    it('should return 403 if user is not authorized', async () => {
      const unauthorizedNotification = {
        ...mockNotification,
        userAddress: '0x9999999999999999999999999999999999999999',
      };

      vi.spyOn(prisma.notification, 'findUnique').mockResolvedValue(unauthorizedNotification);

      const response = await request(app).put('/1');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Unauthorized access');
    });

    it('should return 500 on server error', async () => {
      vi.spyOn(prisma.notification, 'findUnique').mockRejectedValue(new Error('Database error'));

      const response = await request(app).put('/1');

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error has occured');
    });
  });

  describe('POST /bulk', () => {
    it('should create bulk notifications successfully', async () => {
      const mockUserIds = [
        '0x1234567890123456789012345678901234567890',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      ];
      const mockMessage = 'Test bulk notification';
      const mockSubject = 'Test subject';
      const mockResource = 'test-resource';

      const { addNotification } = await import('../../utils');
      vi.mocked(addNotification).mockResolvedValue([
        { ...mockNotification, id: 1 },
        { ...mockNotification, id: 2 },
      ]);

      const response = await request(app).post('/bulk').send({
        userIds: mockUserIds,
        message: mockMessage,
        subject: mockSubject,
        resource: mockResource,
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(addNotification).toHaveBeenCalledWith(mockUserIds, {
        message: mockMessage,
        subject: mockSubject,
        author: '0x1234567890123456789012345678901234567890',
        resource: mockResource,
      });
    });

    it('should create bulk notifications without optional fields', async () => {
      const mockUserIds = ['0x1234567890123456789012345678901234567890'];
      const mockMessage = 'Test message';

      const { addNotification } = await import('../../utils');
      vi.mocked(addNotification).mockResolvedValue([mockNotification]);

      const response = await request(app).post('/bulk').send({
        userIds: mockUserIds,
        message: mockMessage,
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(addNotification).toHaveBeenCalledWith(mockUserIds, {
        message: mockMessage,
        subject: undefined,
        author: '0x1234567890123456789012345678901234567890',
        resource: undefined,
      });
    });

    it('should return 400 if userIds is not an array', async () => {
      const response = await request(app).post('/bulk').send({
        userIds: 'not-an-array',
        message: 'Test message',
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('userIds must be a non-empty array');
    });

    it('should return 400 if userIds is empty array', async () => {
      const response = await request(app).post('/bulk').send({
        userIds: [],
        message: 'Test message',
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('userIds must be a non-empty array');
    });

    it('should return 400 if message is missing', async () => {
      const response = await request(app)
        .post('/bulk')
        .send({
          userIds: ['0x1234567890123456789012345678901234567890'],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('message is required');
    });

    it('should return 400 if message is not a string', async () => {
      const response = await request(app)
        .post('/bulk')
        .send({
          userIds: ['0x1234567890123456789012345678901234567890'],
          message: 123,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('message is required');
    });

    it('should return 500 if addNotification throws error', async () => {
      const { addNotification } = await import('../../utils');
      vi.mocked(addNotification).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/bulk')
        .send({
          userIds: ['0x1234567890123456789012345678901234567890'],
          message: 'Test message',
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error has occured');
    });
  });
});
