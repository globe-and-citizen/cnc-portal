import { z } from 'zod';
import { addressSchema, teamIdSchema } from './common';
import { DEFAULT_MAXIMUM_HOURS_PER_DAY } from '../../utils/wageUtil';

/**
 * Wage-related validation schemas
 */

// Rate per hour schema (reusing from claim.ts but making it more specific here)
export const wageRateSchema = z.object({
  type: z.string().min(1, 'Rate type cannot be empty'),
  amount: z.coerce.number().positive('Rate amount must be positive'),
});

// Set wage request body
export const setWageBodySchema = z
  .object({
    teamId: teamIdSchema,
    userAddress: addressSchema,
    maximumHoursPerWeek: z.coerce
      .number()
      .int()
      .positive('Maximum hours per week must be a positive integer'),
    maximumOvertimeHoursPerWeek: z.coerce
      .number()
      .int()
      .positive('Overtime hours per week must be a positive integer')
      .nullable()
      .optional(),
    // Daily ceiling; defaults to 8h so existing clients keep the status quo.
    maximumHoursPerDay: z.coerce
      .number()
      .int()
      .positive('Maximum hours per day must be a positive integer')
      .max(24, 'Maximum hours per day cannot exceed 24 hours')
      .optional()
      .default(DEFAULT_MAXIMUM_HOURS_PER_DAY),
    ratePerHour: z.array(wageRateSchema).min(1, 'At least one rate must be provided'),
    overtimeRatePerHour: z.array(wageRateSchema).min(1).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const hasOvertimeRates =
      Array.isArray(data.overtimeRatePerHour) && data.overtimeRatePerHour.length > 0;

    if (hasOvertimeRates && data.maximumOvertimeHoursPerWeek == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maximumOvertimeHoursPerWeek'],
        message: 'Maximum overtime hours per week is required when overtime rates are provided',
      });
    }

    if (data.maximumHoursPerWeek > 40) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maximumHoursPerWeek'],
        message: 'Maximum regular hours per week cannot exceed 40 hours',
      });
    }

    if (data.maximumOvertimeHoursPerWeek != null && data.maximumOvertimeHoursPerWeek > 20) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maximumOvertimeHoursPerWeek'],
        message: 'Maximum overtime hours per week cannot exceed 20 hours',
      });
    }
  });

// Get wages query parameters
export const getWagesQuerySchema = z.object({
  teamId: teamIdSchema,
});

// Cancel a wage change that has been scheduled but has not taken effect yet
export const cancelScheduledWageQuerySchema = z.object({
  teamId: teamIdSchema,
  userAddress: addressSchema,
});

// Toggle wage status path params and query
export const toggleWageStatusParamsSchema = z.object({
  wageId: z.coerce.number().int().positive('Wage ID must be a positive integer'),
});

export const toggleWageStatusQuerySchema = z.object({
  action: z.enum(['disable', 'enable'], {
    message: "Invalid action. Allowed actions are: 'disable', 'enable'",
  }),
});
