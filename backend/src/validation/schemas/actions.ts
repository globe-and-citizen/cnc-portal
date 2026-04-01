import { z } from 'zod';
import { addressSchema, positiveIntegerSchema } from './common';

/**
 * Action-related validation schemas
 */

export const getActionsQuerySchema = z.object({
  teamId: positiveIntegerSchema.optional(),
  isExecuted: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((value) => (typeof value === 'string' ? value === 'true' : value))
    .optional(),
  page: positiveIntegerSchema.optional(),
  take: positiveIntegerSchema.optional(),
});

export const addActionBodySchema = z.object({
  teamId: positiveIntegerSchema,
  actionId: positiveIntegerSchema,
  description: z.string().trim().min(1, 'Description is required'),
  targetAddress: addressSchema,
  data: z.string().trim().min(1, 'Encoded call data is required'),
});

export const actionIdParamsSchema = z.object({
  id: positiveIntegerSchema,
});
