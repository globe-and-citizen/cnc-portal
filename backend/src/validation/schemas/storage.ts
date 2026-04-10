import { z } from 'zod';

/**
 * Storage-related validation schemas
 */

// Get presigned URL query parameters
export const getPresignedUrlQuerySchema = z.object({
  key: z.string().min(1, 'The "key" query parameter is required'),
  expiresIn: z.coerce
    .number()
    .int()
    .positive('Expiration must be a positive integer')
    .max(604800, 'Expiration cannot exceed 7 days (604800 seconds)')
    .optional(),
});
