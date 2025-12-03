import { Address } from 'viem';

declare global {
  namespace Express {
    interface Request {
      address: Address;
    }
  }
}
