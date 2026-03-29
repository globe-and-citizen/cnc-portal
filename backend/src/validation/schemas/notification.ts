import { z } from 'zod';
import { positiveIntegerSchema } from './common';

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
  userIds: z.any().optional(),
  message: z.any().optional(),
  subject: z.any().optional(),
  resource: z.any().optional(),
}).default({});
