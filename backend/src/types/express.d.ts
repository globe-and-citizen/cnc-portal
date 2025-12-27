import { User } from '@prisma/client';
import { Address } from 'viem';

declare global {
  namespace Express {
    interface Request {
      address: Address;
      user: User;
    }
  }
}
