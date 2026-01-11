import { Request, Response } from 'express';
import { generateNonce } from 'siwe';
import { prisma } from '../utils';
import { errorResponse } from '../utils/utils';
import {
  uploadProfileImage,
  getPresignedDownloadUrl,
  isStorageConfigured,
  deleteFile,
} from '../services/storageService';

// Type for multipart/form-data request with file
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
  const { name, imageUrl } = req.body;
  const callerAddress = req.address;
  const multerReq = req as MulterRequest;

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
        imageUrl: true,
      },
    });

    if (!user) return errorResponse(404, 'User not found', res);

    let newImageUrl = imageUrl;

    // Handle profile image upload if a file was provided
    if (multerReq.file) {
      if (!isStorageConfigured()) {
        return errorResponse(
          500,
          'File storage is not configured. Please set up Railway Storage.',
          res
        );
      }

      const uploadResult = await uploadProfileImage(multerReq.file, address);

      if (!uploadResult.success) {
        return errorResponse(400, uploadResult.error || 'Failed to upload profile image', res);
      }

      // Generate a presigned URL for the uploaded image
      // Note: This URL will expire, but we store the key and can generate new URLs
      if (uploadResult.metadata) {
        newImageUrl = await getPresignedDownloadUrl(uploadResult.metadata.key, 86400 * 7); // 7 days
      }

      // Delete old profile image from storage if it was stored in Railway Storage
      // We can detect this by checking if the old URL contains our storage endpoint
      if (user.imageUrl && user.imageUrl.includes('storage.railway.app')) {
        try {
          // Extract the key from the old presigned URL (this is a best-effort cleanup)
          const oldUrlMatch = user.imageUrl.match(/profiles\/[^?]+/);
          if (oldUrlMatch) {
            await deleteFile(oldUrlMatch[0]);
          }
        } catch (error) {
          console.error('Failed to delete old profile image:', error);
          // Don't fail the request, just log the error
        }
      }
    }

    const updatedUser = await prisma.user.update({
      where: {
        address: address,
      },
      data: {
        ...(name !== undefined && { name }),
        ...(newImageUrl !== undefined && { imageUrl: newImageUrl }),
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
