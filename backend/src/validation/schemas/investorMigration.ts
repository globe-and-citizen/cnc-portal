import { z } from 'zod';
import { teamIdSchema, addressSchema } from './common';

/**
 * InvestorMigration-related validation schemas.
 *
 * Persists the frozen shareholder snapshot an InvestorV1 -> Investor (v2)
 * Merkle migration was built from, so any shareholder can later fetch their
 * (amount, proof) to self-claim. See issue #2286.
 */

const shareholderSchema = z.object({
  shareholder: addressSchema,
  amount: z.string().regex(/^\d+$/, 'amount must be a base-10 uint256 string'),
});

export const createInvestorMigrationBodySchema = z.object({
  teamId: teamIdSchema,
  previousInvestorAddress: addressSchema,
  newInvestorAddress: addressSchema,
  merkleRoot: z.string().regex(/^0x[0-9a-fA-F]{64}$/, 'merkleRoot must be a 32-byte hex string'),
  blockNumber: z.coerce.number().int().nonnegative(),
  shareholders: z.array(shareholderSchema).min(1),
});

export const getInvestorMigrationQuerySchema = z.object({
  teamId: teamIdSchema,
});
