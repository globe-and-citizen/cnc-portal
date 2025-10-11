import { z } from 'zod';
import { addressSchema, teamIdSchema } from './common';

/**
 * Wage-related validation schemas
 */

// Rate per hour schema (reusing from claim.ts but making it more specific here)
export const wageRateSchema = z.object({
  type: z.string().min(1, 'Rate type cannot be empty'),
  amount: z.coerce.number().positive('Rate amount must be positive'),
});

// Set wage request body
export const setWageBodySchema = z.object({
  teamId: teamIdSchema,
  userAddress: addressSchema,
  maximumHoursPerWeek: z.coerce
    .number()
    .int()
    .positive('Maximum hours per week must be a positive integer'),
  ratePerHour: z.array(wageRateSchema).min(1, 'At least one rate must be provided'),
});

// Get wages query parameters
export const getWagesQuerySchema = z.object({
  teamId: teamIdSchema,
});
