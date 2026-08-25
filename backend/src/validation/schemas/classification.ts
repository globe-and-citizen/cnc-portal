import { z } from 'zod';
import { teamIdSchema } from './common';

/**
 * Transaction-classification validation schemas (issue #2457).
 *
 * A classification pins a manual accounting category onto a single Bank/Safe
 * deposit or withdrawal, keyed by its stable on-chain identity
 * `${txHash}-${logIndex}` — the same id the frontend accounting engine keys its
 * ledger entries on. It overrides the address-inference fallback when present.
 */

/**
 * The manual accounting categories. Mirrors the Prisma
 * `TransactionClassificationCategory` enum; the controller assigns validated
 * values straight to that enum, so any drift surfaces as a compile error there.
 */
export const CLASSIFICATION_CATEGORIES = [
  'REVENUE',
  'EXPENSE',
  'SHAREHOLDER_LOAN',
  'OWNER_CAPITAL',
  'INTERNAL_TRANSFER',
  'PAYROLL_EXPENSE',
  'INTEREST_EXPENSE',
  'DIVIDEND_EXPENSE',
] as const;

export const classificationCategorySchema = z.enum(CLASSIFICATION_CATEGORIES);

/**
 * Stable transaction identity: the canonical lowercase `${txHash}-${logIndex}`.
 * Normalized to lowercase so a mixed-case hash cannot masquerade as a second
 * classification for the same on-chain event.
 */
export const txIdSchema = z
  .string({ message: 'txId is required' })
  .trim()
  .regex(/^0x[0-9a-fA-F]{64}-\d+$/, 'txId must be of the form `${txHash}-${logIndex}`')
  .transform((value) => value.toLowerCase());

/** Optional free-text memo the classifier attaches, capped to keep rows lean. */
export const classificationMemoSchema = z
  .string()
  .trim()
  .max(500, 'Memo cannot exceed 500 characters');

// PUT /accounting/classification — create or update (upsert) a classification
export const upsertClassificationBodySchema = z.object({
  teamId: teamIdSchema,
  txId: txIdSchema,
  category: classificationCategorySchema,
  memo: classificationMemoSchema.optional(),
});

// GET /accounting/classification?teamId= — list a team's classifications
export const getClassificationsQuerySchema = z.object({
  teamId: teamIdSchema,
});

// DELETE /accounting/classification?teamId=&txId= — revert to inference
export const deleteClassificationQuerySchema = z.object({
  teamId: teamIdSchema,
  txId: txIdSchema,
});
