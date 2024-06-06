import { describe, it, expect, vi, MockedFunction, beforeEach } from 'vitest';
import { prisma, errorResponse } from '../../utils';
import { Request, Response } from 'express';
import { isAddress } from 'ethers';
import { addNotification } from '../notificationController';

vi.mock('../../utils', () => {
  return {
    __esModule: true,
    prisma: {
      notification: {
        create: vi.fn()
      },
      $disconnect: vi.fn()
    },
    errorResponse: vi.fn()
  };
});

vi.mock('ethers', () => {
  return {
    isAddress: vi.fn()
  };
});

describe('addNotification', () => {
  let req: Request
  let res: Response
  const resolvedValue = { 
    id: 1, 
    message: 'Resolved message', 
    isRead: false, 
    userAddress: '0x123', 
    createdAt: new Date(Date.now()), 
    subject: null 
  }

  beforeEach(() => {
    req = {
      body: {
        userIds: [],
        notification: { message: '', subject: '' }
      }
    } as Request;
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as unknown as Response;

    (isAddress as unknown as MockedFunction<typeof isAddress>).mockClear();
    (prisma.notification.create as unknown as MockedFunction<typeof prisma.notification.create>).mockClear();
    (prisma.$disconnect as MockedFunction<typeof prisma.$disconnect>).mockClear();
    (errorResponse as MockedFunction<typeof errorResponse>).mockClear();
  });

  it('should create notifications for valid user addresses', async () => {
    req.body.userIds = ['0x123', '0x456'];
    req.body.notification = { message: 'Test message', subject: 'Test subject' };

    // Mock isAddress to return true for all userIds
    (isAddress as unknown as MockedFunction<typeof isAddress>).mockImplementation(() => true);

    // Mock Prisma create method to resolve with a notification
    const createMock = (prisma.notification.create as unknown as MockedFunction<typeof prisma.notification.create>)
    createMock.mockResolvedValue(resolvedValue);

    await addNotification(req, res);

    expect(isAddress).toHaveBeenCalledTimes(2);
    expect(createMock).toHaveBeenCalledTimes(2);
    expect(prisma.$disconnect).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [resolvedValue, resolvedValue]
    });
  });

  it('should return error for invalid user addresses', async () => {
    req.body.userIds = ['0x123', 'invalid_address'];
    req.body.notification = { message: 'Test message', subject: 'Test subject' };

    // Mock isAddress to return true for the first and false for the second userId
    (isAddress as unknown as MockedFunction<typeof isAddress>).mockImplementation((userId: string) => {
      return userId === '0x123'
    });

    // Mock Prisma create method to resolve with a notification
    const createMock = (prisma.notification.create as unknown as MockedFunction<typeof prisma.notification.create>)
    createMock.mockResolvedValue(resolvedValue);

    await addNotification(req, res);

    expect(isAddress).toHaveBeenCalledTimes(2);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(errorResponse).toHaveBeenCalledWith(500, expect.any(Error), res);
    expect(prisma.$disconnect).toHaveBeenCalled();
  });
});
