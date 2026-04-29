import { z } from 'zod';
import { addressSchema, teamIdSchema, positiveIntegerSchema } from './common';

// EIP-712 WageClaim message envelope as signed by the approver. The backend
// rebuilds the typed data with this envelope (plus the verifying contract /
// chainId in the body) and runs `recoverTypedDataAddress` to confirm the
// signature actually came from the caller. Rates and token addresses are not
// re-derived server-side — the on-chain contract is the canonical authority
// at withdraw time, so the backend's job here is just to authenticate the
// signature and record the contract it was bound to (issue #1825).
const wageClaimMessageSchema = z.object({
  employeeAddress: addressSchema,
  minutesWorked: z.number().int().min(0).max(65535),
  date: z.string().regex(/^\d+$/, 'date must be a stringified unsigned integer'),
  wages: z
    .array(
      z.object({
        hourlyRate: z.string().regex(/^\d+$/, 'hourlyRate must be a stringified unsigned integer'),
        tokenAddress: addressSchema,
      })
    )
    .min(1),
});

/**
 * Weekly claim-related validation schemas
 */

// Get weekly claims query parameters
export const getWeeklyClaimsQuerySchema = z.object({
  teamId: teamIdSchema,
  status: z
    .enum(['pending', 'signed', 'withdrawn', 'disabled'], {
      message: 'Invalid status. Allowed statuses are: pending, signed, withdrawn, disabled',
    })
    .optional(),
  userAddress: addressSchema.optional(),
  memberAddress: addressSchema.optional(),
  address: addressSchema.optional(),
});

// Sync weekly claims query parameters
export const syncWeeklyClaimsQuerySchema = z.object({
  teamId: teamIdSchema,
});

// Update weekly claim path parameters
export const weeklyClaimIdParamsSchema = z.object({
  id: positiveIntegerSchema,
});

// Update weekly claim query parameters
export const updateWeeklyClaimQuerySchema = z.object({
  action: z.enum(['sign', 'withdraw', 'disable', 'enable'], {
    message: 'Invalid action. Allowed actions are: sign, withdraw, disable, enable',
  }),
});

// Update weekly claim request body
//
// signedAgainstContractAddress + typedDataMessage + chainId are required only
// for `action=sign` so the backend can authenticate the EIP-712 signature.
// They're optional at the schema level because the same body shape is reused
// for withdraw / disable / enable, where they don't apply. The sign branch in
// the controller enforces presence at request time and surfaces 400 errors.
export const updateWeeklyClaimBodySchema = z.object({
  signature: z.string().optional(),
  signedAgainstContractAddress: addressSchema.optional(),
  typedDataMessage: wageClaimMessageSchema.optional(),
  chainId: z.number().int().positive().optional(),
});
