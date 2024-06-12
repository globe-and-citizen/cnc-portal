import { describe, it, expect, vi, MockedFunction, beforeEach } from 'vitest';
import { prisma, errorResponse } from '../../utils';
import { Request, Response } from 'express';
import { getNotification } from '../notificationController';

vi.mock('../../utils', () => {
  return {
    __esModule: true,
    prisma: {
      notification: {
        create: vi.fn(),
        findMany: vi.fn()
      },
      $disconnect: vi.fn()
    },
    errorResponse: vi.fn()
  };
});

const dummyData = { 
  id: 1, 
  message: 'Test message', 
  isRead: false, 
  userAddress: '0x123', 
  createdAt: new Date(Date.now()), 
  subject: null,
  author: null 
}

describe('getNotification', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {
      query: {},
      address: ''
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };

    (prisma.notification.findMany as MockedFunction<typeof prisma.notification.findMany>).mockClear();
    (prisma.$disconnect as MockedFunction<typeof prisma.$disconnect>).mockClear();
    (errorResponse as MockedFunction<typeof errorResponse>).mockClear();
  });

  it('should return error if userAddress is not set', async () => {
    req.query = {};

    await getNotification(req as Request, res as Response);

    expect(errorResponse).toHaveBeenCalledWith(401, 'ID empty or not set', res);
  });

  it('should return notifications if user is authorized', async () => {
    req.query = { userAddress: '0x123' };
    req.address = '0x123';

    const findManyMock = (prisma.notification.findMany as MockedFunction<typeof prisma.notification.findMany>);
    findManyMock.mockResolvedValue([dummyData]);

    await getNotification(req as Request, res as Response);

    expect(prisma.notification.findMany).toHaveBeenCalledWith({ where: { userAddress: '0x123' } });
    expect(prisma.$disconnect).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [dummyData]
    });
  });

  it('should return unauthorized error if user is not authorized', async () => {
    req.query = { userAddress: '0x123' };
    req.address = '0x456';

    const findManyMock = (prisma.notification.findMany as MockedFunction<typeof prisma.notification.findMany>);
    findManyMock.mockResolvedValue([dummyData]);

    await getNotification(req as Request, res as Response);

    expect(prisma.notification.findMany).toHaveBeenCalledWith({ where: { userAddress: '0x123' } });
    expect(prisma.$disconnect).toHaveBeenCalled();
    expect(errorResponse).toHaveBeenCalledWith(403, 'Unauthorized access', res);
  });

  it('should handle errors gracefully', async () => {
    req.query = { userAddress: '0x123' };

    const findManyMock = (prisma.notification.findMany as MockedFunction<typeof prisma.notification.findMany>);
    findManyMock.mockRejectedValue(new Error('Database error'));

    await getNotification(req as Request, res as Response);

    expect(prisma.notification.findMany).toHaveBeenCalledWith({ where: { userAddress: '0x123' } });
    expect(errorResponse).toHaveBeenCalledWith(500, expect.any(Error), res);
  });
});