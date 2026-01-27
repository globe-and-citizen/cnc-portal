import { Request, Response } from 'express';
import { generateNonce } from 'siwe';
import { prisma } from '../utils';
import { errorResponse } from '../utils/utils';
import {
  uploadFile,
  getPresignedDownloadUrl,
  deleteFile,
  isStorageConfigured,
} from '../services/storageService';
import { isUserPartOfTheTeam } from '../utils/teamUtils';

// Type for requests with multer file
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

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
  const { name, imageUrl, traderSafeAddress, teamId } = req.body;
  const callerAddress = req.address;
  const multerReq = req as MulterRequest;

  try {
    console.log('traderSafeAddress: ', traderSafeAddress)
    console.log('teamId: ', teamId)
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
        traderSafeAddress: true,
      },
    });

    if (!user) return errorResponse(404, 'User not found', res);

    let newImageUrl = imageUrl;

    // Handle profile image upload if file is provided
    if (multerReq.file && isStorageConfigured()) {
      try {
        // Use uploadFile with profile folder (replaces deprecated uploadProfileImage)
        const folder = `profiles/${address.toLowerCase()}`;
        const uploadResult = await uploadFile(multerReq.file, folder);

        if (!uploadResult.success) {
          return errorResponse(400, uploadResult.error || 'Failed to upload profile image', res);
        }

        // Generate presigned URL valid for 7 days
        const signedUrl = await getPresignedDownloadUrl(uploadResult.metadata.key, 86400 * 7);
        newImageUrl = signedUrl;

        // Delete old profile image if it exists and was stored on Railway
        if (user.imageUrl && user.imageUrl.includes('storage.railway.app')) {
          try {
            const oldKeyMatch = user.imageUrl.match(/profiles\/[^?]+/);
            if (oldKeyMatch) {
              await deleteFile(oldKeyMatch[0]);
            }
          } catch (e) {
            console.warn('Could not delete old profile image:', e);
            // Don't fail the update if old image deletion fails
          }
        }
      } catch (error) {
        console.error('Error uploading profile image:', error);
        return errorResponse(500, 'Failed to process profile image upload', res);
      }
    }

    const updatedUser = await prisma.user.update({
      where: { address: address },
      data: {
        ...(name !== undefined && { name }),
        ...(newImageUrl !== undefined && { imageUrl: newImageUrl }),
        ...(traderSafeAddress !== undefined && { traderSafeAddress }),
      },
      select: {
        address: true,
        name: true,
        imageUrl: true,
        traderSafeAddress: true,
      },
    });

    if (teamId && traderSafeAddress) {
      const team = await prisma.team.findUnique({ 
        where: { id: Number(teamId) },
        include: {
          members: true
        }
      })
      const members = team?.members
      if (isUserPartOfTheTeam(members || [], callerAddress)) {
        await prisma.memberTeamsData.update({
          where: {
            memberAddress_teamId: {
              memberAddress: callerAddress,
              teamId: Number(teamId),
            },
          },
          data: {
            isTrader: true
          },
      })
      }
    }

    return res.status(200).json(updatedUser);
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
