import { prisma } from '../utils';
import { Request, Response } from 'express';
import { generateNonce, SiweMessage } from 'siwe';
import { errorResponse } from '../utils/utils';
import { log } from 'console';
import { isAddress } from 'viem';

/**
 *
 * @param req
 * @param res
 * @returns
 */
export const getNonce = async (req: Request, res: Response) => {
  const { address } = req.params;

  try {
    // if (!isAddress(address))
    //   return errorResponse(401, "Get nonce error: Invalid user address", res);

    const user = await prisma.user.findUnique({
      where: {
        address: address,
      },
    });

    if (!user)
      return res.status(200).json({
        success: true,
        nonce: generateNonce(),
      });

    const nonce = user.nonce;

    return res.status(200).json({
      success: true,
      nonce,
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

export const getUser = async (req: Request, res: Response) => {
  const { address } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: {
        address: address,
      },
    });

    if (!user) return errorResponse(404, 'User not found', res);

    return res.status(200).json(user);
  } catch (error) {
    return errorResponse(500, error, res);
  }
};
export const updateUser = async (req: Request, res: Response) => {
  const { address } = req.params;
  const { name, imageUrl } = req.body;
  const callerAddress = (req as any).address;

  try {
    if (!callerAddress) return errorResponse(401, 'Update user error: Missing user address', res);

    if (callerAddress !== address) {
      return errorResponse(403, 'Unauthorized', res);
    }
    const user = await prisma.user.findUnique({
      where: {
        address: address,
      },
      select: {
        address: true,
        name: true,
      },
    });

    if (!user) return errorResponse(404, 'User not found', res);

    const updatedUser = await prisma.user.update({
      where: {
        address: address,
      },
      data: {
        name,
        imageUrl,
      },
      select: {
        address: true,
        name: true,
        imageUrl: true,
      },
    });

    return res.status(200).json(updatedUser);
  } catch (error) {
    return errorResponse(500, error, res);
  }
};
export const getAllUsers = async (req: Request, res: Response) => {
  const { page, limit, search } = req.query;
  const pageNumber = parseInt(page as string) || 1;
  const pageSize = parseInt(limit as string) || 10;
  const offset = (pageNumber - 1) * pageSize;
  // const search = req.query.search as string | undefined | null;
  try {
    // Normalize search into a string to satisfy Prisma types (req.query may contain ParsedQs)

    const rawSearch = search;
    const searchTerm = typeof rawSearch === 'string' ? rawSearch.trim() : '';

    const where =
      searchTerm !== ''
        ? {
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' as const } },
              { address: { contains: searchTerm, mode: 'insensitive' as const } },
            ],
          }
        : undefined;
    console.log('Where clause:', where);

    const users = await prisma.user.findMany({
      skip: offset,
      take: pageSize,
      where,
    });
    const totalUsers = await prisma.user.count({ where });
    return res.status(200).json({
      users,
      totalUsers,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalUsers / pageSize),
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};
