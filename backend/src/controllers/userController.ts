import { PrismaClient } from "@prisma/client";
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
