import { z } from 'zod';
import { teamIdSchema, positiveIntegerSchema } from './common';

/**
 * FixedReturnOffering-related validation schemas.
 *
 * FixedReturn.sol's createLendingOffer has no title/description params — they are
 * persisted here off-chain, linked by the on-chain offerId, per the contract's NatSpec.
 */

// Add offering metadata request body
export const addFixedReturnOfferingBodySchema = z.object({
  teamId: teamIdSchema,
  offerId: positiveIntegerSchema,
  title: z.string().trim().min(1, 'Title is required'),
  purpose: z.string().trim().optional(),
});

// Get offerings query parameters
export const getFixedReturnOfferingsQuerySchema = z.object({
  teamId: teamIdSchema,
  offerId: positiveIntegerSchema.optional(),
});
