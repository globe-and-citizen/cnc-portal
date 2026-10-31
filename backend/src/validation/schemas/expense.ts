import { z } from 'zod';
import { addressSchema, teamIdSchema } from './common';

/**
 * Expense-related validation schemas
 */

// Expense creation request body
export const addExpenseBodySchema = z.object({
  teamId: teamIdSchema,
  signature: z.string().min(1, 'Signature cannot be empty'),
  signedAgainstContractAddress: addressSchema,
  chainId: z.number().int().positive(),
  data: z.object({
    approvedAddress: z.string().min(1, 'approvedAddress is required'),
    amount: z.number().nonnegative(), //.min(1, 'approvedAddress is required'),
    frequencyType: z.number().int().nonnegative(),
    customFrequency: z.number().int().nonnegative(),
    tokenAddress: z.string().min(1, 'tokenAddress is required'),
    startDate: z.number().int().nonnegative(),
    endDate: z.number().int().nonnegative(),
  }),
});

// Get expenses query parameters
export const getExpensesQuerySchema = z.object({
  teamId: teamIdSchema,
  status: z
    .enum(
      [
        'all',
        'pending',
        'approved',
        'rejected',
        'disabled',
        'enabled',
        'expired',
        'limit-reached',
        'signed',
        'historical',
        'unavailable',
      ],
      {
        message: 'Invalid status parameter',
      }
    )
    .default('all'),
});
