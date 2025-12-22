import { z } from 'zod';

/**
 * Schema for updating global submit restriction setting
 */
export const updateGlobalRestrictionSchema = z.object({
  isRestricted: z.boolean({ message: 'isRestricted must be a boolean' }),
});

/**
 * Schema for creating/updating a team override
 */
export const teamOverrideSchema = z.object({
  isRestricted: z.boolean({ message: 'isRestricted must be a boolean' }),
});

/**
 * Schema for team ID parameter
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

/**
 * Schema for search query (available teams)
 */
export const searchQuerySchema = z.object({
  search: z.string().optional(),
  limit: z
    .string()
    .optional()
    .default('50')
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0 && val <= 100, {
      message: 'limit must be between 1 and 100',
    }),
});

/**
 * Schema for checking submit restriction (public endpoint)
 */
export const checkRestrictionQuerySchema = z.object({
  teamId: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0, {
      message: 'teamId must be a positive integer',
    }),
});

// Type exports for use in controllers
export type UpdateGlobalRestrictionInput = z.infer<typeof updateGlobalRestrictionSchema>;
export type TeamOverrideInput = z.infer<typeof teamOverrideSchema>;
export type TeamIdParam = z.infer<typeof teamIdParamSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type CheckRestrictionQuery = z.infer<typeof checkRestrictionQuerySchema>;
