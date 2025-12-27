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

  describe('deleteFeatureByName', () => {
    it('should return 400 for invalid function name', async () => {
      vi.mocked(errorResponse).mockReturnValue(undefined);
      const req = createMockRequest({ params: { functionName: '' } });
      const res = createMockResponse();
      await featureController.deleteFeatureByName(req as Request, res as Response);
      expect(errorResponse).toHaveBeenCalledWith(400, expect.any(String), res);
    });

    it('should return 404 when feature not found', async () => {
      vi.mocked(featureUtils.featureExists).mockResolvedValue(false);
      vi.mocked(errorResponse).mockReturnValue(undefined);

      const req = createMockRequest({ params: { functionName: 'NONEXISTENT' } });
      const res = createMockResponse();

      await featureController.deleteFeatureByName(req as Request, res as Response);

      expect(errorResponse).toHaveBeenCalledWith(404, 'Feature "NONEXISTENT" not found', res);
    });

    it('should return 500 if deletion fails', async () => {
      vi.mocked(featureUtils.featureExists).mockResolvedValue(true);
      vi.mocked(featureUtils.removeFeature).mockResolvedValue(false);
      vi.mocked(errorResponse).mockReturnValue(undefined);

      const req = createMockRequest({ params: { functionName: 'FAIL_DELETE' } });
      const res = createMockResponse();

      await featureController.deleteFeatureByName(req as Request, res as Response);

      expect(errorResponse).toHaveBeenCalledWith(
        500,
        'Failed to delete feature "FAIL_DELETE"',
        res
      );
    });

    it('should delete feature with status 200', async () => {
      vi.mocked(featureUtils.featureExists).mockResolvedValue(true);
      vi.mocked(featureUtils.removeFeature).mockResolvedValue(true);

      const req = createMockRequest({ params: { functionName: 'TO_DELETE' } });
      const res = createMockResponse();

      await featureController.deleteFeatureByName(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Feature "TO_DELETE" and all its overrides have been deleted',
      });
    });

    it('should return 500 on error', async () => {
      const error = new Error('Database error');
      vi.mocked(featureUtils.featureExists).mockRejectedValue(error);
      vi.mocked(errorResponse).mockReturnValue(undefined);
      const req = createMockRequest({ params: { functionName: 'ERROR_CASE' } });
      const res = createMockResponse();
      await featureController.deleteFeatureByName(req as Request, res as Response);
      expect(errorResponse).toHaveBeenCalledWith(500, error, res);
    });
  });

  describe('createOverride', () => {
    it('should return 400 for invalid function name', async () => {
      vi.mocked(errorResponse).mockReturnValue(undefined);
      const req = createMockRequest({
        params: { functionName: '', teamId: '5' },
        body: { status: 'enabled' },
      });
      const res = createMockResponse();
      await featureController.createOverride(req as Request, res as Response);
      expect(errorResponse).toHaveBeenCalledWith(400, expect.any(String), res);
    });

    it('should return 400 for invalid team ID', async () => {
      vi.mocked(errorResponse).mockReturnValue(undefined);
      const req = createMockRequest({
        params: { functionName: 'SUBMIT_RESTRICTION', teamId: '-1' },
        body: { status: 'enabled' },
      });
      const res = createMockResponse();
      await featureController.createOverride(req as Request, res as Response);
      expect(errorResponse).toHaveBeenCalledWith(400, expect.any(String), res);
    });

    it('should return 400 for invalid body - missing status', async () => {
      vi.mocked(errorResponse).mockReturnValue(undefined);
      const req = createMockRequest({
        params: { functionName: 'SUBMIT_RESTRICTION', teamId: '5' },
        body: {}, // Missing required status field
      });
      const res = createMockResponse();
      await featureController.createOverride(req as Request, res as Response);
      expect(errorResponse).toHaveBeenCalledWith(400, expect.any(String), res);
    });

    it('should return 404 if feature not found', async () => {
      vi.mocked(featureUtils.featureExists).mockResolvedValue(false);
      vi.mocked(errorResponse).mockReturnValue(undefined);

      const req = createMockRequest({
        params: { functionName: 'NONEXISTENT', teamId: '5' },
        body: { status: 'disabled' },
      });
      const res = createMockResponse();

      await featureController.createOverride(req as Request, res as Response);

      expect(errorResponse).toHaveBeenCalledWith(404, 'Feature "NONEXISTENT" not found', res);
    });

    it('should return 404 if team not found', async () => {
      vi.mocked(featureUtils.featureExists).mockResolvedValue(true);
      vi.mocked(featureUtils.teamExists).mockResolvedValue(false);
      vi.mocked(errorResponse).mockReturnValue(undefined);

      const req = createMockRequest({
        params: { functionName: 'SUBMIT_RESTRICTION', teamId: '999' },
        body: { status: 'disabled' },
      });
      const res = createMockResponse();

      await featureController.createOverride(req as Request, res as Response);

      expect(errorResponse).toHaveBeenCalledWith(404, 'Team with ID 999 not found', res);
    });

    it('should return 409 if override already exists', async () => {
      vi.mocked(featureUtils.featureExists).mockResolvedValue(true);
      vi.mocked(featureUtils.teamExists).mockResolvedValue(true);
      vi.mocked(featureUtils.overrideExists).mockResolvedValue(true);
      vi.mocked(errorResponse).mockReturnValue(undefined);

      const req = createMockRequest({
        params: { functionName: 'SUBMIT_RESTRICTION', teamId: '5' },
        body: { status: 'disabled' },
      });
      const res = createMockResponse();

      await featureController.createOverride(req as Request, res as Response);

      expect(errorResponse).toHaveBeenCalledWith(
        409,
        expect.stringContaining('Override already exists'),
        res
      );
    });

    it('should create a team override with status 201', async () => {
      const mockOverride = {
        id: 1,
        functionName: 'SUBMIT_RESTRICTION',
        teamId: 5,
        status: 'disabled',
        team: { name: 'Team A' },
      };

      vi.mocked(featureUtils.featureExists).mockResolvedValue(true);
      vi.mocked(featureUtils.teamExists).mockResolvedValue(true);
      vi.mocked(featureUtils.overrideExists).mockResolvedValue(false);
      vi.mocked(featureUtils.insertOverride).mockResolvedValue(mockOverride as any);

      const req = createMockRequest({
        params: { functionName: 'SUBMIT_RESTRICTION', teamId: '5' },
        body: { status: 'disabled' },
      });
      const res = createMockResponse();

      await featureController.createOverride(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Override created for team Team A on feature "SUBMIT_RESTRICTION"',
        data: mockOverride,
      });
    });

    it('should return 500 on error', async () => {
      const error = new Error('Database error');
      vi.mocked(featureUtils.featureExists).mockRejectedValue(error);
      vi.mocked(errorResponse).mockReturnValue(undefined);
      const req = createMockRequest({
        params: { functionName: 'SUBMIT_RESTRICTION', teamId: '5' },
        body: { status: 'disabled' },
      });
      const res = createMockResponse();
      await featureController.createOverride(req as Request, res as Response);
      expect(errorResponse).toHaveBeenCalledWith(500, error, res);
    });
  });

  describe('updateOverride', () => {
    it('should return 400 for invalid function name', async () => {
      vi.mocked(errorResponse).mockReturnValue(undefined);
      const req = createMockRequest({
        params: { functionName: '', teamId: '5' },
        body: { status: 'enabled' },
      });
      const res = createMockResponse();
      await featureController.updateOverride(req as Request, res as Response);
      expect(errorResponse).toHaveBeenCalledWith(400, expect.any(String), res);
    });

    it('should return 400 for invalid body - missing status', async () => {
      vi.mocked(errorResponse).mockReturnValue(undefined);
      const req = createMockRequest({
        params: { functionName: 'SUBMIT_RESTRICTION', teamId: '5' },
        body: {}, // Missing required status field
      });
      const res = createMockResponse();
      await featureController.updateOverride(req as Request, res as Response);
      expect(errorResponse).toHaveBeenCalledWith(400, expect.any(String), res);
    });

    it('should return 404 if feature not found', async () => {
      vi.mocked(featureUtils.featureExists).mockResolvedValue(false);
      vi.mocked(errorResponse).mockReturnValue(undefined);
      const req = createMockRequest({
        params: { functionName: 'NONEXISTENT', teamId: '5' },
        body: { status: 'enabled' },
      });
      const res = createMockResponse();
      await featureController.updateOverride(req as Request, res as Response);
      expect(errorResponse).toHaveBeenCalledWith(404, 'Feature "NONEXISTENT" not found', res);
    });

    it('should return 404 if team not found', async () => {
      vi.mocked(featureUtils.featureExists).mockResolvedValue(true);
      vi.mocked(featureUtils.teamExists).mockResolvedValue(false);
      vi.mocked(errorResponse).mockReturnValue(undefined);
      const req = createMockRequest({
        params: { functionName: 'SUBMIT_RESTRICTION', teamId: '999' },
        body: { status: 'enabled' },
      });
      const res = createMockResponse();
      await featureController.updateOverride(req as Request, res as Response);
      expect(errorResponse).toHaveBeenCalledWith(404, 'Team with ID 999 not found', res);
    });

    it('should return 404 if override does not exist', async () => {
      vi.mocked(featureUtils.featureExists).mockResolvedValue(true);
      vi.mocked(featureUtils.teamExists).mockResolvedValue(true);
      vi.mocked(featureUtils.overrideExists).mockResolvedValue(false);
      vi.mocked(errorResponse).mockReturnValue(undefined);

      const req = createMockRequest({
        params: { functionName: 'SUBMIT_RESTRICTION', teamId: '5' },
        body: { status: 'enabled' },
      });
      const res = createMockResponse();

      await featureController.updateOverride(req as Request, res as Response);

      expect(errorResponse).toHaveBeenCalledWith(
        404,
        expect.stringContaining('No override found'),
        res
      );
    });

    it('should update a team override with status 200', async () => {
      const mockOverride = {
        id: 1,
        functionName: 'SUBMIT_RESTRICTION',
        teamId: 5,
        status: 'enabled',
        team: { name: 'Team A' },
      };

      vi.mocked(featureUtils.featureExists).mockResolvedValue(true);
      vi.mocked(featureUtils.teamExists).mockResolvedValue(true);
      vi.mocked(featureUtils.overrideExists).mockResolvedValue(true);
      vi.mocked(featureUtils.patchOverride).mockResolvedValue(mockOverride as any);

      const req = createMockRequest({
        params: { functionName: 'SUBMIT_RESTRICTION', teamId: '5' },
        body: { status: 'enabled' },
      });
      const res = createMockResponse();

      await featureController.updateOverride(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Override updated to "enabled" for team Team A',
        data: mockOverride,
      });
    });

    it('should return 500 on error', async () => {
      const error = new Error('Database error');
      vi.mocked(featureUtils.featureExists).mockRejectedValue(error);
      vi.mocked(errorResponse).mockReturnValue(undefined);
      const req = createMockRequest({
        params: { functionName: 'SUBMIT_RESTRICTION', teamId: '5' },
        body: { status: 'enabled' },
      });
      const res = createMockResponse();
      await featureController.updateOverride(req as Request, res as Response);
      expect(errorResponse).toHaveBeenCalledWith(500, error, res);
    });
  });

  describe('removeOverride', () => {
    it('should return 400 for invalid function name', async () => {
      vi.mocked(errorResponse).mockReturnValue(undefined);
      const req = createMockRequest({
        params: { functionName: '', teamId: '5' },
      });
      const res = createMockResponse();
      await featureController.removeOverride(req as Request, res as Response);
      expect(errorResponse).toHaveBeenCalledWith(400, expect.any(String), res);
    });

    it('should return 404 if feature not found', async () => {
      vi.mocked(featureUtils.featureExists).mockResolvedValue(false);
      vi.mocked(errorResponse).mockReturnValue(undefined);
      const req = createMockRequest({
        params: { functionName: 'NONEXISTENT', teamId: '5' },
      });
      const res = createMockResponse();
      await featureController.removeOverride(req as Request, res as Response);
      expect(errorResponse).toHaveBeenCalledWith(404, 'Feature "NONEXISTENT" not found', res);
    });

    it('should return 404 if override not found', async () => {
      vi.mocked(featureUtils.featureExists).mockResolvedValue(true);
      vi.mocked(featureUtils.overrideExists).mockResolvedValue(false);
      vi.mocked(errorResponse).mockReturnValue(undefined);

      const req = createMockRequest({
        params: { functionName: 'SUBMIT_RESTRICTION', teamId: '5' },
      });
      const res = createMockResponse();

      await featureController.removeOverride(req as Request, res as Response);

      expect(errorResponse).toHaveBeenCalledWith(
        404,
        expect.stringContaining('No override found'),
        res
      );
    });

    it('should return 500 if deletion fails', async () => {
      vi.mocked(featureUtils.featureExists).mockResolvedValue(true);
      vi.mocked(featureUtils.overrideExists).mockResolvedValue(true);
      vi.mocked(featureUtils.removeOverrideRecord).mockResolvedValue(false);
      vi.mocked(errorResponse).mockReturnValue(undefined);

      const req = createMockRequest({
        params: { functionName: 'SUBMIT_RESTRICTION', teamId: '5' },
      });
      const res = createMockResponse();

      await featureController.removeOverride(req as Request, res as Response);

      expect(errorResponse).toHaveBeenCalledWith(500, 'Failed to delete override', res);
    });

    it('should remove a team override with status 200', async () => {
      vi.mocked(featureUtils.featureExists).mockResolvedValue(true);
      vi.mocked(featureUtils.overrideExists).mockResolvedValue(true);
      vi.mocked(featureUtils.removeOverrideRecord).mockResolvedValue(true);

      const req = createMockRequest({
        params: { functionName: 'SUBMIT_RESTRICTION', teamId: '5' },
      });
      const res = createMockResponse();

      await featureController.removeOverride(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Override removed for team 5. Team now inherits global setting.',
      });
    });

    it('should return 500 on error', async () => {
      const error = new Error('Database error');
      vi.mocked(featureUtils.featureExists).mockRejectedValue(error);
      vi.mocked(errorResponse).mockReturnValue(undefined);
      const req = createMockRequest({
        params: { functionName: 'SUBMIT_RESTRICTION', teamId: '5' },
      });
      const res = createMockResponse();
      await featureController.removeOverride(req as Request, res as Response);
      expect(errorResponse).toHaveBeenCalledWith(500, error, res);
    });
  });

  describe('checkSubmitRestriction', () => {
    it('should return 400 if Team ID is missing', async () => {
      vi.mocked(errorResponse).mockReturnValue(undefined);

      const req = createMockRequest({ params: {} });
      const res = createMockResponse();

      await featureController.checkSubmitRestriction(req as Request, res as Response);

      expect(errorResponse).toHaveBeenCalledWith(400, 'Team ID is required', res);
    });

    it('should return 400 if Team ID is invalid', async () => {
      vi.mocked(errorResponse).mockReturnValue(undefined);

      const req = createMockRequest({ params: { id: 'invalid' } });
      const res = createMockResponse();

      await featureController.checkSubmitRestriction(req as Request, res as Response);

      expect(errorResponse).toHaveBeenCalledWith(400, 'Team ID must be a positive integer', res);
    });

    it('should return 404 if team not found', async () => {
      vi.mocked(featureUtils.teamExists).mockResolvedValue(false);
      vi.mocked(errorResponse).mockReturnValue(undefined);

      const req = createMockRequest({ params: { id: '999' } });
      const res = createMockResponse();

      await featureController.checkSubmitRestriction(req as Request, res as Response);

      expect(errorResponse).toHaveBeenCalledWith(404, 'Team with ID 999 not found', res);
    });
    it('should return isRestricted as true when no feature/override is configured', async () => {
      vi.mocked(featureUtils.teamExists).mockResolvedValue(true);
      vi.mocked(featureUtils.getEffectiveStatus).mockResolvedValue(null);

      const req = createMockRequest({ params: { id: '5' } });
      const res = createMockResponse();

      await featureController.checkSubmitRestriction(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          teamId: 5,
          isRestricted: true,
          effectiveStatus: 'enabled',
        },
      });
    });

    it('should return isRestricted as false when feature status is disabled', async () => {
      vi.mocked(featureUtils.teamExists).mockResolvedValue(true);
      vi.mocked(featureUtils.getEffectiveStatus).mockResolvedValue('disabled');

      const req = createMockRequest({ params: { id: '5' } });
      const res = createMockResponse();

      await featureController.checkSubmitRestriction(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          teamId: 5,
          isRestricted: false,
          effectiveStatus: 'disabled',
        },
      });
    });

    it('should return 500 on error', async () => {
      const error = new Error('Database error');
      vi.mocked(featureUtils.teamExists).mockRejectedValue(error);
      vi.mocked(errorResponse).mockReturnValue(undefined);
      const req = createMockRequest({ params: { id: '5' } });
      const res = createMockResponse();
      await featureController.checkSubmitRestriction(req as Request, res as Response);
      expect(errorResponse).toHaveBeenCalledWith(500, error, res);
    });
  });
});
