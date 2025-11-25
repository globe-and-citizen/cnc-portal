import { z } from 'zod';
import { teamIdSchema, positiveIntegerSchema } from './common';

/**
 * Expense-related validation schemas
 */

// Expense creation request body
export const addExpenseBodySchema = z.object({
  teamId: teamIdSchema,
  signature: z.string().min(1, 'Signature cannot be empty'),
  data: z.object({
    approvedAddress: z.string().min(1, 'approvedAddress is required'),
    // budgetData: z
    //   .array(
    //     z.object({
    //       budgetType: z.number().int().nonnegative(),
    //       value: z.number().nonnegative(),
    //     })
    //   )
    //   .min(1, 'budgetData must have at least one entry'),
    amount: z.number().nonnegative(),//.min(1, 'approvedAddress is required'),
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
    .enum(['all', 'pending', 'approved', 'rejected', 'disabled', 'enabled', 'signed'], {
      message: 'Invalid status parameter',
    })
    .default('all'),
});

// Update expense request body
export const updateExpenseBodySchema = z.object({
  status: z.enum(['disable', 'expired', 'limitReached'], {
    message: 'Invalid status. Allowed values: disable, expired, limitReached',
  }),
});

// Update expense path parameters
export const updateExpenseParamsSchema = z.object({
  id: positiveIntegerSchema,
});
