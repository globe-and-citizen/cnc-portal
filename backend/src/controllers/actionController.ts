import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { errorResponse, prisma } from '../utils';

const getActions = async (req: Request, res: Response) => {
  try {
    const { teamId, isExecuted, page, take } = req.query;
    if (!teamId) return errorResponse(400, 'Team ID empty or not set', res);

    const where: Prisma.BoardOfDirectorActionsWhereInput = {};

    if (teamId) {
      where.teamId = parseInt(teamId as string);
    }
    if (isExecuted) {
      where.isExecuted = isExecuted === 'true';
    }
    const actions = await prisma.boardOfDirectorActions.findMany({
      where,
      skip: page ? (parseInt(page as string) - 1) * parseInt(take as string) : 0,
      take: take ? parseInt(take as string) : 10,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const totalActions = await prisma.boardOfDirectorActions.count({
      where,
    });

    res.status(200).json({
      data: actions,
      total: totalActions,
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

const addAction = async (req: Request, res: Response) => {
  const { teamId, actionId, description, targetAddress, data } = req.body;
  if (!teamId || !description || !targetAddress || !data) {
    return errorResponse(400, 'Missing required fields', res);
  }

  if (!req.address) {
    return errorResponse(401, 'User address not authenticated', res);
  }

  try {
    const newAction = await prisma.boardOfDirectorActions.create({
      data: {
        teamId: parseInt(teamId as string),
        actionId: parseInt(actionId as string),
        description: description as string,
        targetAddress: targetAddress as string,
        userAddress: req.address,
        data: data as string,
      },
    });

    res.status(201).json({
      data: newAction,
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

const executeAction = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return errorResponse(400, 'Action ID empty or not set', res);

  try {
    const action = await prisma.boardOfDirectorActions.findUnique({
      where: {
        id: parseInt(id as string),
      },
    });

    if (!action) return errorResponse(404, 'Action not found', res);

    await prisma.boardOfDirectorActions.update({
      where: {
        id: parseInt(id as string),
      },
      data: {
        isExecuted: true,
      },
    });

    res.status(200).json({});
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

export { addAction, executeAction, getActions };

