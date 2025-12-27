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

  describe('getFeatureByName', () => {
    it('should return 404 when feature not found', async () => {
      vi.mocked(featureUtils.findFeatureByName).mockResolvedValue(null);
      vi.mocked(errorResponse).mockReturnValue(undefined);

      const req = createMockRequest({ params: { functionName: 'NONEXISTENT' } });
      const res = createMockResponse();

      await featureController.getFeatureByName(req as Request, res as Response);

      expect(errorResponse).toHaveBeenCalledWith(404, 'Feature "NONEXISTENT" not found', res);
    });

    it('should return 400 for invalid function name', async () => {
      vi.mocked(errorResponse).mockReturnValue(undefined);

      const req = createMockRequest({ params: { functionName: '' } });
      const res = createMockResponse();

      await featureController.getFeatureByName(req as Request, res as Response);

      expect(errorResponse).toHaveBeenCalledWith(400, expect.any(String), res);
    });

    it('should return feature by name with status 200', async () => {
      const mockFeature = { functionName: 'SUBMIT_RESTRICTION', status: 'enabled' };
      vi.mocked(featureUtils.findFeatureByName).mockResolvedValue(mockFeature as any);

      const req = createMockRequest({ params: { functionName: 'SUBMIT_RESTRICTION' } });
      const res = createMockResponse();

      await featureController.getFeatureByName(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockFeature,
      });
    });

    it('should return 500 on error', async () => {
      const error = new Error('Database error');
      vi.mocked(featureUtils.findFeatureByName).mockRejectedValue(error);
      vi.mocked(errorResponse).mockReturnValue(undefined);
      const req = createMockRequest({ params: { functionName: 'SUBMIT_RESTRICTION' } });
      const res = createMockResponse();
      await featureController.getFeatureByName(req as Request, res as Response);
      expect(errorResponse).toHaveBeenCalledWith(500, error, res);
    });
  });

  describe('createNewFeature', () => {
    it('should return 400 for invalid request body', async () => {
      vi.mocked(errorResponse).mockReturnValue(undefined);

      const req = createMockRequest({ body: { status: 'enabled' } }); // Missing functionName
      const res = createMockResponse();

      await featureController.createNewFeature(req as Request, res as Response);

      expect(errorResponse).toHaveBeenCalledWith(400, expect.any(String), res);
    });

    it('should return 409 if feature already exists', async () => {
      vi.mocked(featureUtils.featureExists).mockResolvedValue(true);
      vi.mocked(errorResponse).mockReturnValue(undefined);

      const req = createMockRequest({
        body: { functionName: 'EXISTING', status: 'enabled' },
      });
      const res = createMockResponse();

      await featureController.createNewFeature(req as Request, res as Response);

      expect(errorResponse).toHaveBeenCalledWith(409, 'Feature "EXISTING" already exists', res);
    });

    it('should create a new feature with status 201', async () => {
      const mockFeature = { functionName: 'NEW_FEATURE', status: 'enabled' };
      vi.mocked(featureUtils.featureExists).mockResolvedValue(false);
      vi.mocked(featureUtils.insertFeature).mockResolvedValue(mockFeature as any);

      const req = createMockRequest({
        body: { functionName: 'NEW_FEATURE', status: 'enabled' },
      });
      const res = createMockResponse();

      await featureController.createNewFeature(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Feature "NEW_FEATURE" created successfully',
        data: mockFeature,
      });
    });

    it('should return 500 on error', async () => {
      const error = new Error('Database error');
      vi.mocked(featureUtils.featureExists).mockRejectedValue(error);
      vi.mocked(errorResponse).mockReturnValue(undefined);
      const req = createMockRequest({
        body: { functionName: 'NEW_FEATURE', status: 'enabled' },
      });
      const res = createMockResponse();
      await featureController.createNewFeature(req as Request, res as Response);
      expect(errorResponse).toHaveBeenCalledWith(500, error, res);
    });
  });

  describe('updateFeatureByName', () => {
    it('should return 400 for invalid function name', async () => {
      vi.mocked(errorResponse).mockReturnValue(undefined);
      const req = createMockRequest({
        params: { functionName: '' },
        body: { status: 'enabled' },
      });
      const res = createMockResponse();
      await featureController.updateFeatureByName(req as Request, res as Response);
      expect(errorResponse).toHaveBeenCalledWith(400, expect.any(String), res);
    });

    it('should return 400 for invalid request body', async () => {
      vi.mocked(errorResponse).mockReturnValue(undefined);
      const req = createMockRequest({
        params: { functionName: 'SUBMIT_RESTRICTION' },
        body: { status: 'invalid_status' },
      });
      const res = createMockResponse();
      await featureController.updateFeatureByName(req as Request, res as Response);
      expect(errorResponse).toHaveBeenCalledWith(400, expect.any(String), res);
    });

    it('should return 404 when feature not found', async () => {
      vi.mocked(featureUtils.featureExists).mockResolvedValue(false);
      vi.mocked(errorResponse).mockReturnValue(undefined);

      const req = createMockRequest({
        params: { functionName: 'NONEXISTENT' },
        body: { status: 'disabled' },
      });
      const res = createMockResponse();

      await featureController.updateFeatureByName(req as Request, res as Response);

      expect(errorResponse).toHaveBeenCalledWith(404, 'Feature "NONEXISTENT" not found', res);
    });

    it('should update feature status with status 200', async () => {
      const mockFeature = { functionName: 'SUBMIT_RESTRICTION', status: 'disabled' };
      vi.mocked(featureUtils.featureExists).mockResolvedValue(true);
      vi.mocked(featureUtils.patchFeature).mockResolvedValue(mockFeature as any);

      const req = createMockRequest({
        params: { functionName: 'SUBMIT_RESTRICTION' },
        body: { status: 'disabled' },
      });
      const res = createMockResponse();

      await featureController.updateFeatureByName(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Feature "SUBMIT_RESTRICTION" updated to "disabled"',
        data: mockFeature,
      });
    });

    it('should return 500 on error', async () => {
      const error = new Error('Database error');
      vi.mocked(featureUtils.featureExists).mockRejectedValue(error);
      vi.mocked(errorResponse).mockReturnValue(undefined);
      const req = createMockRequest({
        params: { functionName: 'SUBMIT_RESTRICTION' },
        body: { status: 'disabled' },
      });
      const res = createMockResponse();
      await featureController.updateFeatureByName(req as Request, res as Response);
      expect(errorResponse).toHaveBeenCalledWith(500, error, res);
    });
  });
});
