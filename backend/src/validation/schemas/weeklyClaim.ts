import { z } from 'zod';
import { isHex } from 'viem';
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
//
// page/limit are optional — when neither is provided, the controller returns
// the full unpaginated set (preserves the existing contract for callers that
// need the whole list, e.g. the claim-history week navigator). When either
// is provided, pagination kicks in and the response is { data, total }.
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
  // Bare optional (no .default) so when the caller omits these, the parsed
  // value stays undefined and the controller can short-circuit pagination.
  // Reusing paginationSchema.shape.page would inject .default(1), which
  // turns "no params" into "page=1" and breaks the opt-in contract.
  page: z.coerce
    .number({ message: 'Page must be a number' })
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .optional(),
  limit: z.coerce
    .number({ message: 'Limit must be a number' })
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .optional(),
});

// Sync weekly claims query parameters
export const syncWeeklyClaimsQuerySchema = z.object({
  teamId: teamIdSchema,
});

// Submit / update weekly goals request body
//
// The weekly goals memo is free-form Markdown, upserted per ISO week. weekStart
// is any ISO datetime within the target week — the controller normalizes it to
// the Monday isoWeek start. An empty string is allowed so the member can clear
// a previously saved memo. Capped to keep the payload (and the TEXT column)
// bounded.
export const submitWeeklyGoalsBodySchema = z.object({
  teamId: teamIdSchema,
  weekStart: z.string().datetime({ message: 'weekStart must be an ISO datetime string' }),
  weeklyGoals: z.string().max(10_000, 'Weekly goals cannot exceed 10000 characters'),
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

// Body required for `action=sign` — the backend authenticates the EIP-712
// signature and records the contract it was bound to. Kept as its own schema
// (rather than inlined in updateWeeklyClaimRequestSchema below) so it's the
// single source of truth for what "required for sign" means, reused by both
// the request-level superRefine and updateWeeklyClaimBodySchema.
export const signWeeklyClaimBodySchema = z.object({
  signature: z
    .string()
    .min(1, 'signature must not be empty')
    .refine((value) => isHex(value), {
      message: 'signature must be a 0x-prefixed hex string',
    }),
  signedAgainstContractAddress: addressSchema,
  typedDataMessage: wageClaimMessageSchema,
  chainId: z.number().int().positive(),
});

// Update weekly claim request body
//
// Derived from signWeeklyClaimBodySchema so the same shape covers
// withdraw / disable / enable, where these fields don't apply and are
// simply absent from the body.
export const updateWeeklyClaimBodySchema = signWeeklyClaimBodySchema.partial();

// Update weekly claim — full request (params + query + body validated
// together).
//
// `action` (query) gates which `body` fields are required (signature +
// signedAgainstContractAddress + typedDataMessage + chainId, for `sign`
// only). Validating params/query/body as three independent schemas can't
// express that cross-field rule — none of them can see the others' data —
// so this single schema is the one wired into the route via
// `validateRequest()` instead of `validate({ params, query, body })`.
export const updateWeeklyClaimRequestSchema = z
  .object({
    params: weeklyClaimIdParamsSchema,
    query: updateWeeklyClaimQuerySchema,
    body: updateWeeklyClaimBodySchema,
  })
  .superRefine((data, ctx) => {
    if (data.query.action !== 'sign') return;

    const signBody = signWeeklyClaimBodySchema.safeParse(data.body);
    if (!signBody.success) {
      signBody.error.issues.forEach((issue) => {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['body', ...issue.path],
          message: issue.message,
        });
      });
    }
  });
