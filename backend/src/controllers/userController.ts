import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { generateNonce } from "siwe";
import { errorResponse } from "../utils/utils";

const prisma = new PrismaClient();

/**
 *
 * @param req
 * @param res
 * @returns
 */
const createUser = async (req: Request, res: Response) => {
  const { address } = req.params;
  const nonce = generateNonce();

  try {
    if (address) {
      await prisma.user.create({
        data: {
          address,
          nonce,
        },
      });

      await prisma.$disconnect();

      res.status(200).json({
        success: true,
        nonce,
      });
    } else {
      throw Error(`address empty, please user address`);
    }
  } catch (error) {
    await prisma.$disconnect();

    return errorResponse(500, error, res);
  }
};

/**
 *
 * @param req
 * @param res
 * @returns
 */
const getNonce = async (req: Request, res: Response) => {
  const { address } = req.params;

  try {
    if (!address)
      return errorResponse(401, "Get nonce error: Missing user address", res);

    const user = await prisma.user.findUnique({
      where: {
        address,
      },
    });

    await prisma.$disconnect();

    if (!user)
      return res.status(200).json({
        success: true,
        nonce: false,
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

export { createUser, getNonce };
