import { Request, Response } from "express";
import { generateNonce, SiweMessage } from "siwe";
import jwt from "jsonwebtoken";
import { errorResponse, extractAddressAndNonce } from "../utils/utils";
import { prisma } from "../utils";
import { faker } from "@faker-js/faker";

export const authenticateSiwe = async (req: Request, res: Response) => {
  try {
    //Get authentication and user data from request body
    const { message, signature } = req.body;

    //Check if authentication and user data exists
    if (!message) return errorResponse(401, "Auth error: Missing message", res);

    if (!signature)
      return errorResponse(401, "Auth error: Missing signature", res);

    let { address, nonce } = extractAddressAndNonce(message);

    //Get nonce from user data from database
    const user = await prisma.user.findUnique({
      where: { address },
    });

    nonce = user ? user.nonce : nonce;

    //Very the data
    const SIWEObject = new SiweMessage(message);

    try {
      await SIWEObject.verify({ signature, nonce });
    } catch (error) {
      return errorResponse(401, (error as any).error.type, res);
    }

    //Update nonce for user and persist in database
    nonce = generateNonce();

    console.log("user: ", user);
    if (user) {
      await prisma.user.update({
        where: { address },
        data: { nonce },
      });
    } else {
      // Generate an initial generatedName
      let generatedName = faker.person.fullName();
      const avatar = faker.image.avatar();

      // Try to create the user and retry on unique constraint error (P2002)
      // This is safer than pre-checking because it avoids race conditions.
      const maxRetries = 5;
      let attempt = 0;
      while (attempt < maxRetries) {
        try {
          await prisma.user.create({
            data: {
              address,
              nonce,
              name: generatedName,
              imageUrl: avatar,
              generatedName: generatedName,
            },
          });
          break; // success
        } catch (err: any) {
          // Prisma unique constraint error code is P2002
          const isUniqueConstraint = err?.code === "P2002";
          if (!isUniqueConstraint) {
            // rethrow unexpected errors
            throw err;
          }

          // If unique constraint, generate a new candidate and retry
          generatedName =
            faker.person.fullName() +
            (Math.floor(Math.random() * 9000) + 1000).toString();
          attempt++;
        }
      }
      // If we exhausted retries and still didn't create, attempt one last time and let error bubble
      if (attempt >= maxRetries) {
        await prisma.user.create({
          data: {
            address,
            nonce,
            name: generatedName,
            imageUrl: avatar,
            generatedName: generatedName,
          },
        });
      }
    }

    //Create JWT for the user and send to the fron-end
    const secretKey = process.env.SECRET_KEY as string;
    const accessToken = jwt.sign({ address }, secretKey, { expiresIn: "24h" });

    return res.status(200).json({
      accessToken,
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

export const authenticateToken = (req: Request, res: Response) => {
  if (!(req as any).address) {
    return errorResponse(401, "Unauthorized: Missing jwt payload", res);
  }

  return res.status(200).json({});
};
