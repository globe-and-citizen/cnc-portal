import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { authorizeUser } from '../authMiddleware';
import jwt from 'jsonwebtoken';

// Mock dependencies
vi.mock('jsonwebtoken');
vi.mock('../../utils/utils', () => ({
  errorResponse: vi.fn((status: number, error: any, res: Response) => {
    res.status(status).json({ message: typeof error === 'string' ? error : error.message });
  }),
}));

describe('authMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: vi.Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      headers: {},
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();

    // Set a test secret key
    process.env.SECRET_KEY = 'test-secret-key';
  });

  describe('authorizeUser', () => {
    it('should return 401 if authorization header is missing', async () => {
      mockRequest.headers = {};

      await authorizeUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Unauthorized: Missing authorization header',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization format is invalid (no Bearer)', async () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat token123',
      };

      await authorizeUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Invalid authorization format',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization format has wrong number of parts', async () => {
      mockRequest.headers = {
        authorization: 'BearerTokenWithoutSpace',
      };

      await authorizeUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Invalid authorization format',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if token verification fails', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      const verifyError = new Error('Invalid token');
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw verifyError;
      });

      await authorizeUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Invalid token',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if payload is empty', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      vi.mocked(jwt.verify).mockReturnValue(null as any);

      await authorizeUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Unauthorized: Missing jwt payload',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should set address and call next if token is valid', async () => {
      const testAddress = '0x1234567890123456789012345678901234567890';
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      vi.mocked(jwt.verify).mockReturnValue({
        address: testAddress,
      } as any);

      await authorizeUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect((mockRequest as any).address).toBe(testAddress);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle unexpected errors and return 500', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      const unexpectedError = new Error('Unexpected error');
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw unexpectedError;
      });

      // Mock errorResponse to throw on 401 so we can catch 500 path
      const { errorResponse } = await import('../../utils/utils');
      vi.mocked(errorResponse).mockImplementation((status: number, error: any, res: Response) => {
        if (status === 401) {
          throw new Error('Triggering 500 path');
        }
        res.status(status).json({ message: typeof error === 'string' ? error : error.message });
      });

      await authorizeUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('should verify token with correct secret key', async () => {
      const testAddress = '0x1234567890123456789012345678901234567890';
      const testToken = 'test-token';
      mockRequest.headers = {
        authorization: `Bearer ${testToken}`,
      };

      vi.mocked(jwt.verify).mockReturnValue({
        address: testAddress,
      } as any);

      await authorizeUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(jwt.verify).toHaveBeenCalledWith(testToken, 'test-secret-key');
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
