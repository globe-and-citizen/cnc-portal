import { describe, expect, it, vi, beforeEach } from 'vitest';
import { addNotification } from '../notificationUtil';
import { prisma } from '../';

// Mock prisma
vi.mock('../', async () => {
  const actual = await vi.importActual('../');
  return {
    ...actual,
    prisma: {
      notification: {
        create: vi.fn(),
      },
    },
  };
});

describe('notificationUtil', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addNotification', () => {
    it('should create notifications for valid user addresses', async () => {
      const userIds = [
        '0x1234567890123456789012345678901234567890',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      ];
      const notification = {
        message: 'Test notification',
        subject: 'Test Subject',
        author: '0x9999999999999999999999999999999999999999',
        resource: 'test-resource',
      };

      const mockNotification = {
        id: 1,
        message: notification.message,
        userAddress: userIds[0],
        subject: notification.subject,
        author: notification.author,
        resource: notification.resource,
        isRead: false,
        createdAt: new Date(),
      };

      vi.mocked(prisma.notification.create).mockResolvedValue(mockNotification);

      const result = await addNotification(userIds, notification);

      expect(result).toHaveLength(2);
      expect(prisma.notification.create).toHaveBeenCalledTimes(2);
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          message: notification.message,
          userAddress: userIds[0],
          subject: notification.subject,
          author: notification.author,
          resource: notification.resource,
        },
      });
    });

    it('should create notifications without optional fields', async () => {
      const userIds = ['0x1234567890123456789012345678901234567890'];
      const notification = {
        message: 'Test notification without optional fields',
      };

      const mockNotification = {
        id: 1,
        message: notification.message,
        userAddress: userIds[0],
        subject: null,
        author: null,
        resource: null,
        isRead: false,
        createdAt: new Date(),
      };

      vi.mocked(prisma.notification.create).mockResolvedValue(mockNotification);

      const result = await addNotification(userIds, notification);

      expect(result).toHaveLength(1);
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          message: notification.message,
          userAddress: userIds[0],
          subject: null,
          author: null,
          resource: null,
        },
      });
    });

    it('should throw error for invalid user address', async () => {
      const userIds = ['invalid-address'];
      const notification = {
        message: 'Test notification',
      };

      await expect(addNotification(userIds, notification)).rejects.toThrow(
        'Invalid user address: invalid-address'
      );
    });

    it('should handle multiple invalid addresses', async () => {
      const userIds = ['0x1234567890123456789012345678901234567890', 'invalid-address'];
      const notification = {
        message: 'Test notification',
      };

      const mockNotification = {
        id: 1,
        message: notification.message,
        userAddress: userIds[0],
        subject: null,
        author: null,
        resource: null,
        isRead: false,
        createdAt: new Date(),
      };

      vi.mocked(prisma.notification.create).mockResolvedValue(mockNotification);

      await expect(addNotification(userIds, notification)).rejects.toThrow(
        'Invalid user address: invalid-address'
      );
    });

    it('should create notifications with only subject', async () => {
      const userIds = ['0x1234567890123456789012345678901234567890'];
      const notification = {
        message: 'Test notification',
        subject: 'Important Update',
      };

      const mockNotification = {
        id: 1,
        message: notification.message,
        userAddress: userIds[0],
        subject: notification.subject,
        author: null,
        resource: null,
        isRead: false,
        createdAt: new Date(),
      };

      vi.mocked(prisma.notification.create).mockResolvedValue(mockNotification);

      const result = await addNotification(userIds, notification);

      expect(result).toHaveLength(1);
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          message: notification.message,
          userAddress: userIds[0],
          subject: notification.subject,
          author: null,
          resource: null,
        },
      });
    });

    it('should handle empty userIds array', async () => {
      const userIds: string[] = [];
      const notification = {
        message: 'Test notification',
      };

      const result = await addNotification(userIds, notification);

      expect(result).toHaveLength(0);
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });
  });
});
