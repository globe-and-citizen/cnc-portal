import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { errorResponse } from '../utils/utils';
import { Address } from 'viem';
import { UserRole } from '../types/roles';
import { prisma } from '../utils/dependenciesUtil';

const authorizeUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract the authorization header (optional)
    const authHeader = req.headers.authorization;

    // Check if authorization header exists
    if (!authHeader) return errorResponse(401, 'Unauthorized: Missing authorization header', res);

    // Split the header to separate scheme and token (if present)
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer')
      return errorResponse(401, 'Invalid authorization format', res);

    // Extract the token from the second part
    const token = parts[1];

    const secretKey = process.env.SECRET_KEY as string;

    let payload;
    try {
      payload = jwt.verify(token, secretKey);
    } catch (error) {
      return errorResponse(401, error, res);
    }

    if (!payload) {
      return errorResponse(401, 'Unauthorized: Missing jwt payload', res);
    }

    const decodedPayload = payload as { address: Address; roles?: UserRole[] };
    // Find user by address in the database

    const user = await prisma.user.findUnique({
      where: { address: decodedPayload.address },
    });

    if (!user) {
      return errorResponse(401, 'Unauthorized: User not found', res);
    }

    req.address = decodedPayload.address;
    req.user = user;

    next();
  } catch (error) {
    return errorResponse(500, error, res);
  }
};

export { authorizeUser };
