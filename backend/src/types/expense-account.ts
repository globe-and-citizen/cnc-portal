import { Prisma } from '@prisma/client';

export type BudgetLimit = Prisma.JsonObject & {
  amount: number | string;
  frequencyType: number;
  customFrequency: number | string;
  approvedAddress: string;
  startDate: number;
  endDate: number;
  tokenAddress: string;
  signedAgainstContractAddress?: string;
  chainId?: number;
  balances?: { 0: string; 1: string };
};
