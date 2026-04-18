import { z } from 'zod';
import { addressSchema, positiveIntegerSchema } from './common';

/**
 * Notification-related validation schemas
 */

export const getNotificationsQuerySchema = z.object({
  isRead: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((value) => (typeof value === 'string' ? value === 'true' : value))
    .optional(),
  type: z.enum(['info', 'warning', 'error', 'success']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const updateNotificationParamsSchema = z.object({
  id: positiveIntegerSchema,
});

export const updateNotificationBodySchema = z
  .object({
    isRead: z.boolean().optional(),
  })
  .default({});

export const createBulkNotificationsBodySchema = z.object({
  userIds: z.array(addressSchema).min(1, 'userIds must be a non-empty array'),
  message: z.string().min(1, 'message is required'),
  subject: z.string().optional(),
  resource: z.string().optional(),
});
