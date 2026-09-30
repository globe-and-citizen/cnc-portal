import { z } from 'zod';
import { nonEmptyStringSchema, urlSchema } from './common';

/**
 * User-related validation schemas
 * Updated for Zod v4 best practices
 */

// Enhanced user update request body with strict validation
export const updateUserBodySchema = z
  .object({
    name: nonEmptyStringSchema.max(100, 'Name cannot exceed 100 characters').optional(),
    imageUrl: urlSchema.optional(),
  })
  .refine((data) => data.name !== undefined || data.imageUrl !== undefined, {
    message: 'At least one field (name or imageUrl) must be provided for update',
  });

// Enhanced pagination query for users with proper validation
export const userPaginationQuerySchema = z.object({
  page: z.coerce
    .number({ message: 'Page must be a number' })
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .default(1),
  limit: z.coerce
    .number({ message: 'Limit must be a number' })
    .int('Limit must be an integer')
    .min(1, 'Minimum limit is 1')
    .max(100, 'Maximum limit is 100')
    .default(10),
  search: z.coerce.string().trim().optional(),
});
