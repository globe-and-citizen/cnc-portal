import { z } from 'zod';
import { addressSchema, teamIdSchema } from './common';

/**
 * Claim-related validation schemas
 */

// Rate per hour validation
export const ratePerHourSchema = z.object({
  type: z.string().min(1, 'Rate type cannot be empty'),
  amount: z.coerce.number().positive('Rate amount must be positive'),
});

// Claim creation request body
export const addClaimBodySchema = z.object({
  teamId: teamIdSchema,
  hoursWorked: z.coerce.number().positive('Hours worked must be positive'),
  memo: z
    .string()
    .trim()
    .min(1, 'Memo cannot be empty')
    .refine((memo) => memo.split(/\s+/).length <= 3000, {
      message: 'Memo is too long, maximum 3000 words allowed',
    }),
  dayWorked: z.iso.datetime().optional(),
  attachments: z
    .array(
      z.object({
        fileKey: z.string().min(1, 'File key is required'),
        fileUrl: z.string().url('Invalid file URL'),
        fileType: z.string().min(1, 'File type is required'),
        fileSize: z.number().positive('File size must be positive'),
      })
    )
    .max(10, 'Maximum 10 files allowed')
    .optional(),
});

// Claim update request body (for signature)
export const updateClaimBodySchema = z.object({
  hoursWorked: z.coerce.number().min(1).max(24).optional(),
  memo: z.string().trim().max(200, 'Memo is too long, maximum 200 characters').optional(),
  dayWorked: z.string().optional(),
  deletedFileIndexes: z.array(z.number().int().nonnegative()).optional(), // Array of indexes to delete
  attachments: z
    .array(
      z.object({
        fileKey: z.string().min(1, 'File key is required'),
        fileUrl: z.string().url('Invalid file URL'),
        fileType: z.string().min(1, 'File type is required'),
        fileSize: z.number().positive('File size must be positive'),
      })
    )
    .max(10, 'Maximum 10 files allowed')
    .optional(),
});

// Get claims query parameters
export const getClaimsQuerySchema = z.object({
  teamId: teamIdSchema,
  status: z.string().optional(),
  memberAddress: addressSchema.optional(),
});
