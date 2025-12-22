import { Request, Response } from 'express';
import { errorResponse } from '../utils/utils';
import { prisma } from '../utils';
import {
  getGlobalSubmitRestriction,
  setGlobalSubmitRestriction,
  getTeamOverrides,
  setTeamOverride,
  deleteTeamOverride,
  getAvailableTeamsForOverride,
  getSubmitRestrictionStatus,
  isSubmitRestricted,
} from '../utils/submitRestrictionUtils';
import {
  updateGlobalRestrictionSchema,
  teamOverrideSchema,
  teamIdParamSchema,
  paginationQuerySchema,
  searchQuerySchema,
  checkRestrictionQuerySchema,
} from '../validation/submitRestrictionValidation';

// Get submit restriction status & Returns global setting and override count
export const getStatus = async (_req: Request, res: Response) => {
  try {
    const status = await getSubmitRestrictionStatus();

    return res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

// Get global submit restriction setting
export const getGlobalSetting = async (_req: Request, res: Response) => {
  try {
    const globalSetting = await getGlobalSubmitRestriction();

    return res.status(200).json({
      success: true,
      data: {
        isRestricted: globalSetting?.isGloballyRestricted ?? true,
        status: globalSetting?.status ?? 'enabled',
        updatedAt: globalSetting?.updatedAt ?? null,
      },
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

// Update global submit restriction setting
export const updateGlobalSetting = async (req: Request, res: Response) => {
  try {
    const validation = updateGlobalRestrictionSchema.safeParse(req.body);

    if (!validation.success) {
      return errorResponse(400, validation.error.issues[0].message, res);
    }

    const { isRestricted } = validation.data;
    const globalSetting = await setGlobalSubmitRestriction(isRestricted);

    return res.status(200).json({
      success: true,
      message: `Global submit restriction ${isRestricted ? 'enabled' : 'disabled'}`,
      data: {
        isRestricted: globalSetting.isGloballyRestricted,
        status: globalSetting.status,
        updatedAt: globalSetting.updatedAt,
      },
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

// Get team overrides with pagination
export const getOverrides = async (req: Request, res: Response) => {
  try {
    const validation = paginationQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return errorResponse(400, validation.error.issues[0].message, res);
    }

    const { page, pageSize } = validation.data;
    const result = await getTeamOverrides(page, pageSize);

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

// Create or update a team override
export const createOrUpdateOverride = async (req: Request, res: Response) => {
  try {
    const paramValidation = teamIdParamSchema.safeParse(req.params);

    if (!paramValidation.success) {
      return errorResponse(400, paramValidation.error.issues[0].message, res);
    }

    const bodyValidation = teamOverrideSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      return errorResponse(400, bodyValidation.error.issues[0].message, res);
    }

    const { teamId } = paramValidation.data;
    const { isRestricted } = bodyValidation.data;

    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return errorResponse(404, `Team with ID ${teamId} not found`, res);
    }

    const override = await setTeamOverride(teamId, isRestricted);

    return res.status(200).json({
      success: true,
      message: `Override ${isRestricted ? 'enabled' : 'disabled'} for team ${override.teamName}`,
      data: override,
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

//  Delete a team override (team will inherit global setting)
export const removeOverride = async (req: Request, res: Response) => {
  try {
    const paramValidation = teamIdParamSchema.safeParse(req.params);

    if (!paramValidation.success) {
      return errorResponse(400, paramValidation.error.issues[0].message, res);
    }

    const { teamId } = paramValidation.data;
    const deleted = await deleteTeamOverride(teamId);

    if (!deleted) {
      return errorResponse(404, `No override found for team ID ${teamId}`, res);
    }

    return res.status(200).json({
      success: true,
      message: `Override removed for team ID ${teamId}. Team now inherits global setting.`,
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

// Get teams available for override (teams without existing override)
export const getAvailableTeams = async (req: Request, res: Response) => {
  try {
    const validation = searchQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return errorResponse(400, validation.error.issues[0].message, res);
    }

    const { search, limit } = validation.data;
    const teams = await getAvailableTeamsForOverride(search, limit);

    return res.status(200).json({
      success: true,
      data: teams,
    });
  } catch (error) {
    console.error('Error getting available teams:', error);
    return errorResponse(500, error, res);
  }
};

// Check if submit is restricted for a specific team
export const checkRestriction = async (req: Request, res: Response) => {
  try {
    const validation = checkRestrictionQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return errorResponse(400, validation.error.issues[0].message, res);
    }

    const { teamId } = validation.data;

    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return errorResponse(404, `Team with ID ${teamId} not found`, res);
    }

    const restricted = await isSubmitRestricted(teamId);

    return res.status(200).json({
      success: true,
      data: {
        teamId,
        teamName: team.name,
        isRestricted: restricted,
        message: restricted
          ? 'Submit is restricted to current week only'
          : 'Submit is allowed for any date',
      },
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};
