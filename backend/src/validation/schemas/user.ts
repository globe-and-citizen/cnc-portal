import { z } from 'zod';
import { addressSchema, positiveIntegerSchema, nonEmptyStringSchema, urlSchema } from './common';

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

// User creation schema (if needed for future endpoints)
export const createUserBodySchema = z.object({
  name: nonEmptyStringSchema.max(100, 'Name cannot exceed 100 characters'),
  address: addressSchema,
  imageUrl: urlSchema.optional(),
});

// User profile validation (comprehensive schema for profile updates)
export const userProfileSchema = z.object({
  name: nonEmptyStringSchema
    .max(100, 'Name cannot exceed 100 characters')
    .refine((name) => !name.includes('<') && !name.includes('>'), {
      message: 'Name cannot contain HTML tags',
    }),
  bio: z.string().trim().max(500, 'Bio cannot exceed 500 characters').optional(),
  website: urlSchema.optional(),
  twitter: z
    .string()
    .trim()
    .regex(/^@?[a-zA-Z0-9_]{1,15}$/, 'Invalid Twitter handle format')
    .optional(),
  github: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/, 'Invalid GitHub username format')
    .optional(),
});
