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
const createUser = async (req: Request, res: Response) => {
  try {
    //Get authentication data from reguest
    const { address } = req.params;
    const { message, signature } = req.body

    //Check to make sure authentication data is not empty
    if (!address)
      return errorResponse(401, "Create user error: Missing user address", res)

    if (!message)
      return errorResponse(401, "Create user error: Missing SIWE message", res)

    if (!signature)
      return errorResponse(401, "Create user error: Missing signature", res)

    //Check user is owner of the address
    const SIWEObject = new SiweMessage(message)
    const { data } = await SIWEObject.verify({signature})

    if (data.address !== address) {
      await prisma.$disconnect()
      return errorResponse(403, "Create user error: User verification failed", res) 
    }

    //Generate nonce
    const nonce = generateNonce();

    //Create user and register new nonce
    await prisma.user.create({
      data: {
        address,
        nonce,
      },
    });

    await prisma.$disconnect();

    //Return response
    res.status(200).json({
      success: true,
      nonce,
    });
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
        address: address
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

export { createUser, getNonce };
