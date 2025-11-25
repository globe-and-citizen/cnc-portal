import { Prisma } from '@prisma/client';

export type BudgetLimit = Prisma.JsonObject & {
  amount: number | string;
  frequencyType: number;
  customFrequency: number | string;
  approvedAddress: string;
  // budgetData: Array<{
  //   budgetType: number;
  //   value: number;
  // }>;
  startDate: number;
  endDate: number;
  tokenAddress: string;
};
