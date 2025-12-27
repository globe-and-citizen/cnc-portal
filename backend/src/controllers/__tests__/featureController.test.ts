import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import * as featureController from '../featureController';
import * as featureUtils from '../../utils/featureUtils';
import { errorResponse } from '../../utils/utils';

// Mock dependencies
vi.mock('../../utils/featureUtils');
vi.mock('../../utils/utils');

// Mock response object
const createMockResponse = (): Partial<Response> => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
});

// Mock request object
const createMockRequest = (overrides = {}): Partial<Request> => ({
  params: {},
  body: {},
  ...overrides,
});

describe('Feature Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listFeatures', () => {
    it('should return all features with status 200', async () => {
      const mockFeatures = [
        { functionName: 'SUBMIT_RESTRICTION', status: 'enabled' },
        { functionName: 'APPROVAL_FLOW', status: 'disabled' },
      ];

      vi.mocked(featureUtils.findAllFeatures).mockResolvedValue(mockFeatures as any);

      const req = createMockRequest();
      const res = createMockResponse();

      await featureController.listFeatures(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockFeatures,
      });
    });

    it('should handle errors and return 500', async () => {
      const error = new Error('Database error');
      vi.mocked(featureUtils.findAllFeatures).mockRejectedValue(error);
      vi.mocked(errorResponse).mockReturnValue(undefined);

      const req = createMockRequest();
      const res = createMockResponse();

      await featureController.listFeatures(req as Request, res as Response);

      expect(errorResponse).toHaveBeenCalledWith(500, error, res);
    });
  });
});
