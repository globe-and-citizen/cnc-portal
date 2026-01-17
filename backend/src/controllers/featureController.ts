import { Request, Response } from 'express';
import { errorResponse } from '../utils/utils';
import {
  featureExists,
  findAllFeatures,
  findFeatureByName,
  getEffectiveStatus,
  insertFeature,
  insertOverride,
  overrideExists,
  patchFeature,
  patchOverride,
  removeFeature,
  removeOverrideRecord,
  teamExists,
} from '../utils/featureUtils';

/** GET /features — List all features */
export const listFeatures = async (_req: Request, res: Response) => {
  try {
    const features = await findAllFeatures();
    return res.status(200).json(features);
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

/** GET /features/:functionName — Get a single feature */
export const getFeatureByName = async (req: Request, res: Response) => {
  try {
    const { functionName } = req.params;
    const feature = await findFeatureByName(functionName);

    if (!feature) {
      return errorResponse(404, `Feature "${functionName}" not found`, res);
    }

    return res.status(200).json(feature);
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

/** POST /features — Create a new feature */
export const createNewFeature = async (req: Request, res: Response) => {
  try {
    const { functionName, status } = req.body;

    if (await featureExists(functionName)) {
      return errorResponse(409, `Feature "${functionName}" already exists`, res);
    }

    const feature = await insertFeature(functionName, status);

    return res.status(201).json(feature);
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

/** PUT /features/:functionName — Update a feature's status */
export const updateFeatureByName = async (req: Request, res: Response) => {
  try {
    const { functionName } = req.params;
    const { status } = req.body;

    if (!(await featureExists(functionName))) {
      return errorResponse(404, `Feature "${functionName}" not found`, res);
    }

    const feature = await patchFeature(functionName, status);

    return res.status(200).json(feature);
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

/** DELETE /features/:functionName — Delete a feature and its overrides */
export const deleteFeatureByName = async (req: Request, res: Response) => {
  try {
    const { functionName } = req.params;

    if (!(await featureExists(functionName))) {
      return errorResponse(404, `Feature "${functionName}" not found`, res);
    }

    const deleted = await removeFeature(functionName);
    if (!deleted) {
      return errorResponse(500, `Failed to delete feature "${functionName}"`, res);
    }

    return res.status(204).send();
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

/** POST /features/:functionName/teams — Create a team override */
export const createOverride = async (req: Request, res: Response) => {
  try {
    const { functionName } = req.params;
    const { teamId, status } = req.body;

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

    return res.status(201).json(override);
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

/** PUT /features/:functionName/teams/:teamId — Update a team override */
export const updateOverride = async (req: Request, res: Response) => {
  try {
    const { functionName, teamId } = req.params;
    const { status } = req.body;

    if (!(await featureExists(functionName))) {
      return errorResponse(404, `Feature "${functionName}" not found`, res);
    }

    if (!(await teamExists(parseInt(teamId)))) {
      return errorResponse(404, `Team with ID ${teamId} not found`, res);
    }

    if (!(await overrideExists(functionName, parseInt(teamId)))) {
      return errorResponse(
        404,
        `No override found for team ${teamId} on feature "${functionName}". Use POST to create.`,
        res
      );
    }

    const override = await patchOverride(functionName, parseInt(teamId), status);

    return res.status(200).json(override);
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

/** DELETE /features/:functionName/teams/:teamId — Remove a team override */
export const removeOverride = async (req: Request, res: Response) => {
  try {
    const { functionName, teamId } = req.params;

    if (!(await featureExists(functionName))) {
      return errorResponse(404, `Feature "${functionName}" not found`, res);
    }

    if (!(await overrideExists(functionName, parseInt(teamId)))) {
      return errorResponse(
        404,
        `No override found for team ${teamId} on feature "${functionName}"`,
        res
      );
    }

    const deleted = await removeOverrideRecord(functionName, parseInt(teamId));
    if (!deleted) {
      return errorResponse(500, `Failed to delete override`, res);
    }

    return res.status(204).send();
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

//Check if submit restriction is active for a team (used by frontend).
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
      teamId,
      isRestricted,
      effectiveStatus: effectiveStatus ?? 'enabled',
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};
