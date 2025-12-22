import { Request, Response } from 'express';
import { errorResponse } from '../utils/utils';
import {
  getAllFeatures,
  getFeature,
  createFeature,
  updateFeature,
  deleteFeature,
  featureExists,
  createTeamOverride,
  updateTeamOverride,
  deleteTeamOverride,
  teamOverrideExists,
  teamExists,
} from '../utils/featureUtils';
import {
  functionNameParamSchema,
  createFeatureSchema,
  updateFeatureSchema,
  featureTeamParamsSchema,
  teamOverrideSchema,
} from '../validation/featureValidation';

// List all features
export const listFeatures = async (_req: Request, res: Response) => {
  try {
    const features = await getAllFeatures();

    return res.status(200).json({
      success: true,
      data: features,
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

// Get a specific feature by functionName
export const getFeatureByName = async (req: Request, res: Response) => {
  try {
    const paramValidation = functionNameParamSchema.safeParse(req.params);

    if (!paramValidation.success) {
      return errorResponse(400, paramValidation.error.issues[0].message, res);
    }

    const { functionName } = paramValidation.data;
    const feature = await getFeature(functionName);

    if (!feature) {
      return errorResponse(404, `Feature "${functionName}" not found`, res);
    }

    return res.status(200).json({
      success: true,
      data: feature,
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

// Create a new feature
export const createNewFeature = async (req: Request, res: Response) => {
  try {
    const bodyValidation = createFeatureSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      return errorResponse(400, bodyValidation.error.issues[0].message, res);
    }

    const { functionName, status } = bodyValidation.data;

    // Check if feature already exists
    if (await featureExists(functionName)) {
      return errorResponse(409, `Feature "${functionName}" already exists`, res);
    }

    const feature = await createFeature(functionName, status);

    return res.status(201).json({
      success: true,
      message: `Feature "${functionName}" created successfully`,
      data: feature,
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

// Update a feature's status
export const updateFeatureByName = async (req: Request, res: Response) => {
  try {
    const paramValidation = functionNameParamSchema.safeParse(req.params);

    if (!paramValidation.success) {
      return errorResponse(400, paramValidation.error.issues[0].message, res);
    }

    const bodyValidation = updateFeatureSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      return errorResponse(400, bodyValidation.error.issues[0].message, res);
    }

    const { functionName } = paramValidation.data;
    const { status } = bodyValidation.data;

    // Check if feature exists
    if (!(await featureExists(functionName))) {
      return errorResponse(404, `Feature "${functionName}" not found`, res);
    }

    const feature = await updateFeature(functionName, status);

    return res.status(200).json({
      success: true,
      message: `Feature "${functionName}" updated to "${status}"`,
      data: feature,
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

// Delete a feature
export const deleteFeatureByName = async (req: Request, res: Response) => {
  try {
    const paramValidation = functionNameParamSchema.safeParse(req.params);

    if (!paramValidation.success) {
      return errorResponse(400, paramValidation.error.issues[0].message, res);
    }

    const { functionName } = paramValidation.data;

    // Check if feature exists
    if (!(await featureExists(functionName))) {
      return errorResponse(404, `Feature "${functionName}" not found`, res);
    }

    const deleted = await deleteFeature(functionName);

    if (!deleted) {
      return errorResponse(500, `Failed to delete feature "${functionName}"`, res);
    }

    return res.status(200).json({
      success: true,
      message: `Feature "${functionName}" and all its overrides have been deleted`,
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

// Create a team override for a feature
export const createOverride = async (req: Request, res: Response) => {
  try {
    const paramValidation = featureTeamParamsSchema.safeParse(req.params);

    if (!paramValidation.success) {
      return errorResponse(400, paramValidation.error.issues[0].message, res);
    }

    const bodyValidation = teamOverrideSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      return errorResponse(400, bodyValidation.error.issues[0].message, res);
    }

    const { functionName, teamId } = paramValidation.data;
    const { status } = bodyValidation.data;

    // Check if feature exists
    if (!(await featureExists(functionName))) {
      return errorResponse(404, `Feature "${functionName}" not found`, res);
    }

    // Check if team exists
    if (!(await teamExists(teamId))) {
      return errorResponse(404, `Team with ID ${teamId} not found`, res);
    }

    // Check if override already exists
    if (await teamOverrideExists(functionName, teamId)) {
      return errorResponse(
        409,
        `Override already exists for team ${teamId} on feature "${functionName}". Use PUT to update.`,
        res
      );
    }

    const override = await createTeamOverride(functionName, teamId, status);

    return res.status(201).json({
      success: true,
      message: `Override created for team ${override.teamName} on feature "${functionName}"`,
      data: override,
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

// Update a team override
export const updateOverride = async (req: Request, res: Response) => {
  try {
    const paramValidation = featureTeamParamsSchema.safeParse(req.params);

    if (!paramValidation.success) {
      return errorResponse(400, paramValidation.error.issues[0].message, res);
    }

    const bodyValidation = teamOverrideSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      return errorResponse(400, bodyValidation.error.issues[0].message, res);
    }

    const { functionName, teamId } = paramValidation.data;
    const { status } = bodyValidation.data;

    // Check if feature exists
    if (!(await featureExists(functionName))) {
      return errorResponse(404, `Feature "${functionName}" not found`, res);
    }

    // Check if team exists
    if (!(await teamExists(teamId))) {
      return errorResponse(404, `Team with ID ${teamId} not found`, res);
    }

    // Check if override exists
    if (!(await teamOverrideExists(functionName, teamId))) {
      return errorResponse(
        404,
        `No override found for team ${teamId} on feature "${functionName}". Use POST to create.`,
        res
      );
    }

    const override = await updateTeamOverride(functionName, teamId, status);

    return res.status(200).json({
      success: true,
      message: `Override updated to "${status}" for team ${override.teamName}`,
      data: override,
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

// Delete a team override
export const removeOverride = async (req: Request, res: Response) => {
  try {
    const paramValidation = featureTeamParamsSchema.safeParse(req.params);

    if (!paramValidation.success) {
      return errorResponse(400, paramValidation.error.issues[0].message, res);
    }

    const { functionName, teamId } = paramValidation.data;

    // Check if feature exists
    if (!(await featureExists(functionName))) {
      return errorResponse(404, `Feature "${functionName}" not found`, res);
    }

    // Check if override exists
    if (!(await teamOverrideExists(functionName, teamId))) {
      return errorResponse(
        404,
        `No override found for team ${teamId} on feature "${functionName}"`,
        res
      );
    }

    const deleted = await deleteTeamOverride(functionName, teamId);

    if (!deleted) {
      return errorResponse(500, `Failed to delete override`, res);
    }

    return res.status(200).json({
      success: true,
      message: `Override removed for team ${teamId}. Team now inherits global setting.`,
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};
