import { z } from 'zod';
import { addressSchema, teamIdSchema, positiveIntegerSchema } from './common';

/**
 * Weekly claim-related validation schemas
 */

// Get weekly claims query parameters
export const getWeeklyClaimsQuerySchema = z.object({
  teamId: teamIdSchema,
  status: z
    .enum(['pending', 'signed', 'withdrawn', 'disabled'], {
      message: 'Invalid status. Allowed statuses are: pending, signed, withdrawn, disabled',
    })
    .optional(),
  userAddress: addressSchema.optional(),
  memberAddress: addressSchema.optional(),
  address: addressSchema.optional(),
});

// Sync weekly claims query parameters
export const syncWeeklyClaimsQuerySchema = z.object({
  teamId: teamIdSchema,
});

// Update weekly claim path parameters
export const weeklyClaimIdParamsSchema = z.object({
  id: positiveIntegerSchema,
});

// Update weekly claim query parameters
export const updateWeeklyClaimQuerySchema = z.object({
  action: z.enum(['sign', 'withdraw', 'disable', 'enable'], {
    message: 'Invalid action. Allowed actions are: sign, withdraw, disable, enable',
  }),
});

// Update weekly claim request body
export const updateWeeklyClaimBodySchema = z.object({
  signature: z.string().optional(),
  contractAddress: addressSchema.optional(),
  chainId: z.number().int().positive().optional(),
});
