import { z } from 'zod';

/**
 * Valid status values for features
 * - "enabled": Feature is active
 * - "disabled": Feature is inactive
 * - "beta": Feature is in beta testing
 */
export const featureStatusEnum = z.enum(['enabled', 'disabled', 'beta'], {
  message: 'status must be "enabled", "disabled", or "beta"',
});

/**
 * Schema for functionName path parameter
 */
export const functionNameParamSchema = z.object({
  functionName: z
    .string()
    .min(1, { message: 'functionName is required' })
    .regex(/^[A-Z_]+$/, {
      message:
        'functionName must be uppercase letters and underscores only (e.g., SUBMIT_RESTRICTION)',
    }),
});

/**
 * Schema for creating a new feature
 */
export const createFeatureSchema = z.object({
  functionName: z
    .string()
    .min(1, { message: 'functionName is required' })
    .regex(/^[A-Z_]+$/, {
      message: 'functionName must be uppercase letters and underscores only',
    }),
  status: featureStatusEnum,
});

/**
 * Schema for updating a feature
 */
export const updateFeatureSchema = z.object({
  status: featureStatusEnum,
});

/**
 * Schema for team ID path parameter
 */
export const teamIdParamSchema = z.object({
  teamId: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0, {
      message: 'teamId must be a positive integer',
    }),
});

/**
 * Schema for combined functionName and teamId params
 */
export const featureTeamParamsSchema = z.object({
  functionName: z
    .string()
    .min(1, { message: 'functionName is required' })
    .regex(/^[A-Z_]+$/, {
      message: 'functionName must be uppercase letters and underscores only',
    }),
  teamId: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0, {
      message: 'teamId must be a positive integer',
    }),
});

/**
 * Schema for creating/updating a team override
 */
export const teamOverrideSchema = z.object({
  status: featureStatusEnum,
});

/**
 * Schema for creating a team override (with teamId in body)
 */
export const createTeamOverrideSchema = z.object({
  teamId: z
    .number()
    .int()
    .positive({ message: 'teamId must be a positive integer' }),
  status: featureStatusEnum,
});

/**
 * Schema for pagination query parameters
 */
export const paginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0, {
      message: 'page must be a positive integer',
    }),
  pageSize: z
    .string()
    .optional()
    .default('10')
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0 && val <= 100, {
      message: 'pageSize must be between 1 and 100',
    }),
});

// Type exports for use in controllers
export type FeatureStatus = z.infer<typeof featureStatusEnum>;
export type FunctionNameParam = z.infer<typeof functionNameParamSchema>;
export type CreateFeatureInput = z.infer<typeof createFeatureSchema>;
export type UpdateFeatureInput = z.infer<typeof updateFeatureSchema>;
export type TeamIdParam = z.infer<typeof teamIdParamSchema>;
export type FeatureTeamParams = z.infer<typeof featureTeamParamsSchema>;
export type TeamOverrideInput = z.infer<typeof teamOverrideSchema>;
export type CreateTeamOverrideInput = z.infer<typeof createTeamOverrideSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
