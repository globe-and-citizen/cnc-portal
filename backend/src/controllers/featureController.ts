import { Request, Response } from 'express';
import { errorResponse } from '../utils/utils';
import {
  // featureExists,
  findAllFeatures,
  findFeatureByName,
  // getEffectiveStatus,
  // insertFeature,
  // insertOverride,
  // overrideExists,
  // patchFeature,
  // patchOverride,
  // removeFeature,
  // removeOverrideRecord,
  // teamExists,
} from '../utils/featureUtils';
import {
  functionNameParamSchema,
  createFeatureSchema,
  updateFeatureSchema,
  featureTeamParamsSchema,
  teamOverrideSchema,
} from '../validation/featureValidation';

// DB helpers & mappers live in `src/utils/featureUtils.ts`.

// =============================================================================
// FEATURE CRUD HANDLERS
// =============================================================================

/** GET /features — List all features */
export const listFeatures = async (_req: Request, res: Response) => {
  try {
    const features = await findAllFeatures();
    return res.status(200).json({ success: true, data: features });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

/** GET /features/:functionName — Get a single feature */
export const getFeatureByName = async (req: Request, res: Response) => {
  try {
    const validation = functionNameParamSchema.safeParse(req.params);
    if (!validation.success) {
      return errorResponse(400, validation.error.issues[0].message, res);
    }

    const { functionName } = validation.data;
    const feature = await findFeatureByName(functionName);
    console.log('feature', feature);
    return []

    if (!feature) {
      return errorResponse(404, `Feature "${functionName}" not found`, res);
    }

    return res.status(200).json({ success: true, data: feature });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

/** POST /features — Create a new feature */
export const createNewFeature = async (req: Request, res: Response) => {
  try {
    const validation = createFeatureSchema.safeParse(req.body);
    if (!validation.success) {
      return errorResponse(400, validation.error.issues[0].message, res);
    }

    const { functionName, status } = validation.data;

    if (await featureExists(functionName)) {
      return errorResponse(409, `Feature "${functionName}" already exists`, res);
    }

    const feature = await insertFeature(functionName, status);

    return res.status(201).json({
      success: true,
      message: `Feature "${functionName}" created successfully`,
      data: feature,
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

/** PUT /features/:functionName — Update a feature's status */
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

    if (!(await featureExists(functionName))) {
      return errorResponse(404, `Feature "${functionName}" not found`, res);
    }

    const feature = await patchFeature(functionName, status);

    return res.status(200).json({
      success: true,
      message: `Feature "${functionName}" updated to "${status}"`,
      data: feature,
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

/** DELETE /features/:functionName — Delete a feature and its overrides */
export const deleteFeatureByName = async (req: Request, res: Response) => {
  try {
    const validation = functionNameParamSchema.safeParse(req.params);
    if (!validation.success) {
      return errorResponse(400, validation.error.issues[0].message, res);
    }

    const { functionName } = validation.data;

    if (!(await featureExists(functionName))) {
      return errorResponse(404, `Feature "${functionName}" not found`, res);
    }

    const deleted = await removeFeature(functionName);
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

// =============================================================================
// TEAM OVERRIDE HANDLERS
// =============================================================================

/** POST /features/:functionName/teams/:teamId — Create a team override */
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

    if (!(await featureExists(functionName))) {
      return errorResponse(404, `Feature "${functionName}" not found`, res);
    }

    if (!(await teamExists(teamId))) {
      return errorResponse(404, `Team with ID ${teamId} not found`, res);
    }

    if (await overrideExists(functionName, teamId)) {
      return errorResponse(
        409,
        `Override already exists for team ${teamId} on feature "${functionName}". Use PUT to update.`,
        res
      );
    }

    const override = await insertOverride(functionName, teamId, status);

    return res.status(201).json({
      success: true,
      message: `Override created for team ${override.teamName} on feature "${functionName}"`,
      data: override,
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

/** PUT /features/:functionName/teams/:teamId — Update a team override */
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

    if (!(await featureExists(functionName))) {
      return errorResponse(404, `Feature "${functionName}" not found`, res);
    }

    if (!(await teamExists(teamId))) {
      return errorResponse(404, `Team with ID ${teamId} not found`, res);
    }

    if (!(await overrideExists(functionName, teamId))) {
      return errorResponse(
        404,
        `No override found for team ${teamId} on feature "${functionName}". Use POST to create.`,
        res
      );
    }

    const override = await patchOverride(functionName, teamId, status);

    return res.status(200).json({
      success: true,
      message: `Override updated to "${status}" for team ${override.teamName}`,
      data: override,
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

/** DELETE /features/:functionName/teams/:teamId — Remove a team override */
export const removeOverride = async (req: Request, res: Response) => {
  try {
    const validation = featureTeamParamsSchema.safeParse(req.params);
    if (!validation.success) {
      return errorResponse(400, validation.error.issues[0].message, res);
    }

    const { functionName, teamId } = validation.data;

    if (!(await featureExists(functionName))) {
      return errorResponse(404, `Feature "${functionName}" not found`, res);
    }

    if (!(await overrideExists(functionName, teamId))) {
      return errorResponse(
        404,
        `No override found for team ${teamId} on feature "${functionName}"`,
        res
      );
    }

    const deleted = await removeOverrideRecord(functionName, teamId);
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

// =============================================================================
// PUBLIC ENDPOINT — SUBMIT RESTRICTION CHECK
// =============================================================================

/**
 * GET /teams/:id/submit-restriction
 * Check if submit restriction is active for a team (used by frontend).
 * - enabled  = restriction active (current week only)
 * - disabled = no restriction (any date)
 */
export const checkSubmitRestriction = async (req: Request, res: Response) => {
  try {
    const teamIdParam = req.params.id;

    if (!teamIdParam) {
      return errorResponse(400, 'Team ID is required', res);
    }

    const teamId = parseInt(teamIdParam, 10);

    if (isNaN(teamId) || teamId <= 0) {
      return errorResponse(400, 'Team ID must be a positive integer', res);
    }

    if (!(await teamExists(teamId))) {
      return errorResponse(404, `Team with ID ${teamId} not found`, res);
    }

    const effectiveStatus = await getEffectiveStatus('SUBMIT_RESTRICTION', teamId);

    // Default to enabled (restricted) if no feature/override configured
    const isRestricted = effectiveStatus === null || effectiveStatus === 'enabled';

    return res.status(200).json({
      success: true,
      data: {
        teamId,
        isRestricted,
        effectiveStatus: effectiveStatus ?? 'enabled',
      },
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};
