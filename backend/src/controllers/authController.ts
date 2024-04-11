import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { generateNonce, SiweMessage } from "siwe";
import jwt from "jsonwebtoken";
import { errorResponse } from "../utils/utils";

const prisma = new PrismaClient();

const authenticateSiwe = async (req: Request, res: Response) => {
  try {
    //Get authentication and user data from request body
    const { message, signature, address } = req.body;

    //Check if authentication and user data exists
    if (!message) return errorResponse(401, "Auth error: Missing message", res);

    if (!signature)
      return errorResponse(401, "Auth error: Missing signature", res);

    if (!address) return errorResponse(401, "Auth error: Missing address", res);

    //Get nonce from user data from database
    const user = await prisma.user.findUnique({
      where: { address },
    });

    if (!user) {
      await prisma.$disconnect();
      return errorResponse(403, "Auth error: User not found", res);
    }

    let nonce = user.nonce

    //Very the data
    const SIWEObject = new SiweMessage(message);

    await SIWEObject.verify({ signature, nonce });

    //Update nonce for user and persist in database
    nonce = generateNonce();
    await prisma.user.update({
      where: { address },
      data: { nonce },
    });

    await prisma.$disconnect();

    //Create JWT for the user and send to the fron-end
    const secretKey = process.env.SECRET_KEY as string;
    const accessToken = jwt.sign({ address }, secretKey, { expiresIn: "24h" });

    return res.status(200).json({
      success: true,
      accessToken,
    });
  } catch (error) {
    await prisma.$disconnect();

    return errorResponse(500, error, res);
  }
};

export { authenticateSiwe };
