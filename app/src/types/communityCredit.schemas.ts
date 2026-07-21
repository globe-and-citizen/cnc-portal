import { z } from 'zod'
import { parseUnits } from 'viem'
import { FIXED_RETURN_TERM_MAXIMUMS, sumWhitelistAmountUnits } from '@/utils'
import { formatAmountWithPrecision } from '@/utils/currencyUtil'

/** Same underlying FixedReturn contract, same basic rules — adapted to CreditCallForm's
 *  string-typed form fields. */
export const creditCallBasicsSchema = z.object({
  name: z.string().min(3, 'Round name must be at least 3 characters'),
  target: z.coerce
    .number({ error: 'Target amount is required' })
    .positive('Target amount must be greater than 0')
})

interface CreditCallTermsSchemaContext {
  today: string
}

/** Deadline/term rules, since Credit's rate field lives in the Terms step rather than
 *  Basics — scoped to exactly the fields CreditCallTermsStep.vue owns. Rate deliberately
 *  allows 0 here — an interest-free round is a valid Community Credit use case and the
 *  contract places no floor on interestRateBps.
 *  Cap validation belongs to CreditCallAccessStep.vue (where the cap fields actually
 *  live in Credit's step layout) and is handled separately, not here.
 *  `period` is always submitted on-chain as Days (NewView.vue hardcodes
 *  termUnit: 'days'), so the cap is a flat 365 days regardless of which unit the
 *  issuer used to enter it — no per-unit max needed like FixedReturn. */
export function createCreditCallTermsSchema(context: CreditCallTermsSchemaContext) {
  return z
    .object({
      rate: z.coerce
        .number({ error: 'Interest rate is required' })
        .min(0, 'Rate cannot be negative')
        .max(100, 'Rate must be 100% or less'),
      deadline: z.string().min(1, 'Subscription deadline is required'),
      period: z
        .number({ error: 'Term is required' })
        .int('Term must be a whole number')
        .positive('Term must be greater than 0')
        .max(
          FIXED_RETURN_TERM_MAXIMUMS.days,
          `Term cannot exceed ${FIXED_RETURN_TERM_MAXIMUMS.days} days`
        )
    })
    .refine((data) => data.deadline >= context.today, {
      message: 'Subscription deadline cannot be in the past',
      path: ['deadline']
    })
}

interface CreditCallAccessSchemaContext {
  /** The round's target amount — whitelist allocations and the cap are checked against this. */
  target: number
  /** The round's token decimals — whitelist sums are compared in the token's smallest-unit
   *  terms (bigint), not raw floats, so this check can never accept a total that would then
   *  revert on-chain with a rounding mismatch. Defaults to 6 (every FixedReturn-supported
   *  token today) if the token can't be resolved yet. */
  decimals?: number
}

/** Community Credit's searchable, per-lender custom-amount whitelist only allows
 *  two whitelist modes — capOn off: every lender is uncapped, no per-lender amount
 *  needed; capOn on: every lender needs an explicit amount, and they must sum to at
 *  least the target (matching FixedReturn.sol's UNCAPPED_ALLOCATION vs. a capped
 *  allocation — summing to more is an allowed buffer against a lender who doesn't end
 *  up depositing). There's no third, mixed state where some lenders are capped and one
 *  is left blank. Also carries the extra cap-required/cap-≤-target checks, since
 *  Credit's cap fields live in this step rather than a separate Terms step. */
export function createCreditCallAccessSchema(context: CreditCallAccessSchemaContext) {
  const decimals = context.decimals ?? 6
  const targetUnits = parseUnits(String(context.target), decimals)

  return z
    .object({
      access: z.enum(['everyone', 'restricted']),
      whitelist: z.array(
        z.object({
          username: z.string(),
          address: z.string(),
          amount: z.number().positive('Lender amount must be greater than zero').nullable()
        })
      ),
      capOn: z.boolean(),
      cap: z.coerce.number().optional()
    })
    .refine((data) => data.access !== 'restricted' || data.whitelist.length > 0, {
      message: 'Add at least one lender',
      path: ['whitelist']
    })
    .refine(
      (data) =>
        data.access !== 'restricted' ||
        !data.capOn ||
        data.whitelist.every((w) => w.amount != null),
      {
        message: 'Set an amount for every whitelisted lender before publishing',
        path: ['whitelist']
      }
    )
    .refine(
      (data) => {
        if (data.access !== 'restricted' || !data.capOn) return true
        // Mirrors FixedReturn.sol's AllocationSumBelowFundingTarget. With the cap on,
        // every lender already has an explicit amount (enforced above), so there's no
        // "uncapped lender absorbs the rest" escape hatch — the sum must be able to
        // reach the target under full participation. Summing to more is fine and
        // expected (a buffer against a lender who doesn't end up depositing); actual
        // deposits can never over-raise regardless, since lendFunds caps the running
        // total at the target. Compared in smallest-unit (bigint) terms, exactly as
        // the contract sums each scaled allocation.
        return sumWhitelistAmountUnits(data.whitelist, decimals) >= targetUnits
      },
      {
        message: 'Whitelisted allocations must add up to at least the target amount',
        path: ['whitelist']
      }
    )
    .refine(
      (data) => {
        if (data.access !== 'restricted') return true
        // Mirrors FixedReturn.sol's DuplicateWhitelistAddress — a repeated address
        // would silently overwrite its earlier allocation on-chain while still
        // counting both towards the sum, defeating the exact-match check above.
        const seen = new Set<string>()
        for (const entry of data.whitelist) {
          const addr = entry.address.toLowerCase()
          if (seen.has(addr)) return false
          seen.add(addr)
        }
        return true
      },
      {
        message: 'Each lender can only appear once in the whitelist',
        path: ['whitelist']
      }
    )
    .refine((data) => !data.capOn || (typeof data.cap === 'number' && data.cap > 0), {
      message: 'Enter a maximum amount per lender',
      path: ['cap']
    })
    .refine((data) => !data.capOn || typeof data.cap !== 'number' || data.cap <= context.target, {
      message: 'Cap cannot exceed the principal target',
      path: ['cap']
    })
}

interface RepayAmountSchemaContext {
  outstanding: number
  treasuryBalance: number
  tokenSymbol?: string
}

export function createRepayAmountSchema({
  outstanding,
  treasuryBalance,
  tokenSymbol = 'Token'
}: RepayAmountSchemaContext) {
  return z.object({
    amount: z
      .number()
      .positive('Amount must be greater than 0.')
      .refine((value) => value <= outstanding, {
        message: `Cannot exceed outstanding balance of ${formatAmountWithPrecision(outstanding, 0, 4)} ${tokenSymbol}.`
      })
      .refine((value) => value <= treasuryBalance, {
        message: `Cannot exceed treasury balance of ${formatAmountWithPrecision(treasuryBalance, 0, 4)} ${tokenSymbol}.`
      })
  })
}

interface LendAmountSchemaContext {
  /** The tighter of the round's remaining funding gap and the lender's own remaining
   *  whitelist allocation/general cap — same figure already shown in the modal's
   *  "Remaining"/"Your cap left" tile (`CreditLendModal.vue`'s `displayRemaining`). */
  remaining: number
  tokenSymbol?: string
}

export function createLendAmountSchema({ remaining, tokenSymbol = 'Token' }: LendAmountSchemaContext) {
  return z.object({
    amount: z
      .number()
      .positive('Amount must be greater than 0.')
      .refine((value) => value <= remaining, {
        message: `Cannot exceed remaining amount of ${formatAmountWithPrecision(remaining, 0, 4)} ${tokenSymbol}.`
      })
  })
}
