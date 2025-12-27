import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { generateNonce, SiweMessage } from 'siwe';
import { prisma } from '../utils';
import { errorResponse, extractAddressAndNonce } from '../utils/utils';
import { DEFAULT_USER_ROLES } from '../types/roles';

export const authenticateSiwe = async (req: Request, res: Response) => {
  try {
    // Get validated authentication data from request body (validated by middleware)
    const { message, signature } = req.body;

    const { address, nonce } = extractAddressAndNonce(message);

    //Get nonce from user data from database
    const user = await prisma.user.findUnique({
      where: { address },
    });

    const actualNonce = user ? user.nonce : nonce;

    //Very the data
    const SIWEObject = new SiweMessage(message);

    try {
      await SIWEObject.verify({ signature, nonce: actualNonce });
    } catch (error) {
      const err = error as { error: { type: string } };
      return errorResponse(401, err.error.type, res);
    }

    //Update nonce for user and persist in database
    const newNonce = generateNonce();

    if (user)
      await prisma.user.update({
        where: { address },
        data: { nonce: newNonce },
      });
    else
      await prisma.user.create({
        data: {
          address,
          nonce: newNonce,
          roles: DEFAULT_USER_ROLES,
          // name: faker.person.firstName(),
          // imageUrl: faker.image.avatar(),
          name: 'User',
          imageUrl: `https://api.dicebear.com/9.x/bottts/svg?seed=${address}`,
        },
      });

    //Create JWT for the user and send to the fron-end
    const secretKey = process.env.SECRET_KEY as string;
    const accessToken = jwt.sign({ address }, secretKey, { expiresIn: '24h' });

    return res.status(200).json({
      accessToken,
    });
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

export const authenticateToken = (req: Request, res: Response) => {
  if (!(req as { address?: string }).address) {
    return errorResponse(401, 'Unauthorized: Missing jwt payload', res);
  }

  return res.status(200).json({});
};
