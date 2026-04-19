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

/**
 * Canonical shape of a single file attachment stored in `Claim.fileAttachments`
 * (Prisma `Json?`). Also used to validate incoming attachment entries on write
 * paths and to tolerantly parse stored rows on read paths.
 */
export const fileAttachmentSchema = z.object({
  fileKey: z.string().min(1, 'File key is required'),
  fileUrl: z.string().url('Invalid file URL'),
  fileType: z.string().min(1, 'File type is required'),
  fileSize: z.number().positive('File size must be positive'),
});

export const fileAttachmentsArraySchema = z
  .array(fileAttachmentSchema)
  .max(10, 'Maximum 10 files allowed');

export type FileAttachmentData = z.infer<typeof fileAttachmentSchema>;

/**
 * Parse a stored `Claim.fileAttachments` JSON column tolerantly, dropping any
 * entries that don't match the canonical schema. Returns an empty array if the
 * input is null or not an array. Use on read paths where the persisted data
 * predates schema enforcement and may contain legacy / malformed rows.
 */
export const parseStoredAttachments = (stored: unknown): FileAttachmentData[] => {
  if (!Array.isArray(stored)) return [];
  return stored.flatMap((item) => {
    const parsed = fileAttachmentSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
};

// Claim creation request body
export const addClaimBodySchema = z.object({
  teamId: teamIdSchema,
  hoursWorked: z.coerce
    .number()
    .int('Hours worked must be a whole number of minutes')
    .min(10, 'Minimum 10 minutes')
    .max(1440, 'Cannot exceed 24 hours (1440 minutes)')
    .refine((val) => val % 10 === 0, {
      message: 'Minutes must be in 10-minute increments (10, 20, 30, ...)',
    }),
  memo: z
    .string()
    .trim()
    .min(1, 'Memo cannot be empty')
    .refine((memo) => memo.split(/\s+/).length <= 3000, {
      message: 'Memo is too long, maximum 3000 words allowed',
    }),
  dayWorked: z.iso.datetime().optional(),
  attachments: fileAttachmentsArraySchema.optional(),
});

// Claim update request body (for signature)
export const updateClaimBodySchema = z.object({
  hoursWorked: z.coerce
    .number()
    .int('Hours worked must be a whole number of minutes')
    .min(10, 'Minimum 10 minutes')
    .max(1440, 'Cannot exceed 24 hours (1440 minutes)')
    .refine((val) => val % 10 === 0, {
      message: 'Minutes must be in 10-minute increments (10, 20, 30, ...)',
    })
    .optional(),
  memo: z
    .string()
    .trim()
    .refine((memo) => memo.split(/\s+/).length <= 3000, {
      message: 'Memo is too long, maximum 3000 words allowed',
    })
    .optional(),
  dayWorked: z.string().optional(),
  deletedFileIndexes: z.array(z.number().int().nonnegative()).optional(), // Array of indexes to delete
  attachments: fileAttachmentsArraySchema.optional(),
});

// Get claims query parameters
export const getClaimsQuerySchema = z.object({
  teamId: teamIdSchema,
  status: z.string().optional(),
  memberAddress: addressSchema.optional(),
});
