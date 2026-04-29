import { Request, Response } from 'express';
import { generateNonce } from 'siwe';
import { prisma } from '../utils';
import { errorResponse } from '../utils/utils';
import { extractProfileStorageKey, resolveStorageImageUrl } from '../utils/profileImage.util';
import { isStorageConfigured } from '../services/storageService';
import { deleteFileByKey } from '../services/attachmentService';

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

    const resolvedImageUrl = await resolveStorageImageUrl(user.imageUrl);
    return res.status(200).json({
      ...user,
      imageUrl: resolvedImageUrl,
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const { address } = req.params;
  const { name, imageUrl } = req.body;
  const callerAddress = req.address;

  try {
    if (!callerAddress) return errorResponse(401, 'Update user error: Missing user address', res);

    if (callerAddress !== address) {
      return errorResponse(403, 'Unauthorized', res);
    }

    const user = await prisma.user.findUnique({
      where: { address: address },
      select: {
        address: true,
        name: true,
        imageUrl: true,
      },
    });

    if (!user) return errorResponse(404, 'User not found', res);

    // Clean up old profile image when imageUrl changes
    if (imageUrl !== undefined && imageUrl !== user.imageUrl && isStorageConfigured()) {
      const oldProfileKey = extractProfileStorageKey(user.imageUrl);
      const nextProfileKey = extractProfileStorageKey(imageUrl);

      if (oldProfileKey && oldProfileKey !== nextProfileKey) {
        await deleteFileByKey(oldProfileKey);
      }
    }

    const updatedUser = await prisma.user.update({
      where: { address: address },
      data: {
        ...(name !== undefined && { name }),
        ...(imageUrl !== undefined && { imageUrl }),
      },
      select: {
        address: true,
        name: true,
        imageUrl: true,
      },
    });

    const resolvedUpdatedImageUrl = await resolveStorageImageUrl(updatedUser.imageUrl);
    return res.status(200).json({
      ...updatedUser,
      imageUrl: resolvedUpdatedImageUrl,
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  const { page, limit, search } = req.query as { page: string; limit: string; search: string };
  const pageNumber = parseInt(page as string) || 1;
  const pageSize = parseInt(limit as string) || 10;
  const offset = (pageNumber - 1) * pageSize;

  try {
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { address: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : undefined;
    const users = await prisma.user.findMany({
      skip: offset,
      take: pageSize,
      where,
    });

    const usersWithResolvedImages = await Promise.all(
      users.map(async (user) => ({
        ...user,
        imageUrl: await resolveStorageImageUrl(user.imageUrl),
      }))
    );

    const totalUsers = await prisma.user.count({ where });
    return res.status(200).json({
      users: usersWithResolvedImages,
      totalUsers,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalUsers / pageSize),
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};
