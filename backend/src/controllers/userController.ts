import { PrismaClient, Prisma } from "@prisma/client";
import { Request, Response } from "express";
import { generateNonce, SiweMessage } from "siwe";
import { errorResponse } from "../utils/utils";

const prisma = new PrismaClient();

/**
 *
 * @param req
 * @param res
 * @returns
 */
export const getNonce = async (req: Request, res: Response) => {
  const { address } = req.params;

  try {
    if (!address)
      return errorResponse(401, "Get nonce error: Missing user address", res);

    const user = await prisma.user.findUnique({
      where: {
        address: address,
      },
    });

    await prisma.$disconnect();

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
    await prisma.$disconnect();
    return errorResponse(500, error, res);
  }
};

export const getUser = async (req: Request, res: Response) => {
  const { address } = req.params;
  try {
    if (!address)
      return errorResponse(401, "Get user error: Missing user address", res);

    const user = await prisma.user.findUnique({
      where: {
        address: address,
      },
    });

    await prisma.$disconnect();

    if (!user) return errorResponse(404, "User not found", res);

    return res.status(200).json(user);
  } catch (error) {
    await prisma.$disconnect();
    return errorResponse(500, error, res);
  }
};
export const updateUser = async (req: Request, res: Response) => {
  const { address } = req.params;
  const { name } = req.body;
  const callerAddress = req.body.address;

  try {
    if (!address)
      return errorResponse(401, "Update user error: Missing user address", res);
    if (callerAddress !== address) {
      return errorResponse(403, "Unauthorized", res);
    }
    const user = await prisma.user.findUnique({
      where: {
        address: address,
      },
    });

    await prisma.$disconnect();

    if (!user) return errorResponse(404, "User not found", res);

    const updatedUser = await prisma.user.update({
      where: {
        address: address,
      },
      data: {
        name,
      },
    });

    return res.status(200).json(updatedUser);
  } catch (error) {
    await prisma.$disconnect();
    return errorResponse(500, error, res);
  }
};
export const getAllUsers = async (req: Request, res: Response) => {
  const { page, limit, ownerAddress, query } = req.query;
  const pageNumber = parseInt(page as string) || 1;
  const pageSize = parseInt(limit as string) || 10;
  const offset = (pageNumber - 1) * pageSize;

  const whereQuery: Prisma.UserWhereInput = {};
  if (query as string) {
    whereQuery.OR = [
      {
        name: {
          contains: query as string,
          mode: "insensitive",
        },
      },
      {
        address: {
          contains: query as string,
        },
      },
    ];
  }
  if (ownerAddress as string) {
    whereQuery.ownedTeams = {
      every: {
        ownerAddress: ownerAddress as string,
      },
    };
  }

  try {
    const users = await prisma.user.findMany({
      skip: offset,
      take: pageSize,
      where: whereQuery,
    });
    const totalUsers = await prisma.user.count();
    await prisma.$disconnect();
    return res.status(200).json({
      users,
      totalUsers,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalUsers / pageSize),
    });
  } catch (error) {
    await prisma.$disconnect();
    return errorResponse(500, error, res);
  }
};

export const searchUser = async (req: Request, res: Response) => {
  const { name, address } = req.query;

  try {
    if (!name && !address)
      return errorResponse(401, "Search error: Missing name and address", res);

    const users = await prisma.user.findMany({
      where: {
        OR: [
          {
            name: {
              contains: name as string,
              mode: "insensitive",
            },
          },
          {
            address: {
              contains: address as string,
            },
          },
        ],
      },
    });

    await prisma.$disconnect();

    return res.status(200).json({ success: true, users });
  } catch (error) {
    await prisma.$disconnect();
    return errorResponse(500, error, res);
  }
};

export const getAllContractors = async (req: Request, res: Response) => {
  const { ownerAddress } = req.params;
  const { query } = req.query;

  if (!ownerAddress)
    return errorResponse(
      400,
      "Get all contractors error: Missing address",
      res
    );
  try {
    const users = await prisma.user.findMany({
      where: {
        ownedTeams: {
          every: {
            ownerAddress: ownerAddress,
          },
        },
        OR: [
          {
            name: {
              contains: query as string,
              mode: "insensitive",
            },
          },
          {
            address: {
              contains: query as string,
            },
          },
        ],
      },
    });
    return res.status(200).json({ success: true, users });
  } catch (error) {
    return errorResponse(500, error, res);
  } finally {
    await prisma.$disconnect();
  }
};
