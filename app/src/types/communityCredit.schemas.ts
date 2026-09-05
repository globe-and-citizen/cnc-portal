import { z } from 'zod'
import { parseUnits } from 'viem'
import { addCreditTerm, CREDIT_TERM_MAX_YEARS } from '@/utils/communityCredit/offer'
import { formatCalendarBreakdown, sumWhitelistAmountUnits } from '@/utils/communityCredit/model'
import { formatAmountWithPrecision } from '@/utils/currency/display'

/** Same underlying FixedReturn contract, same basic rules — adapted to CreditCallForm's
 *  string-typed form fields. */
export const creditCallBasicsSchema = z.object({
  name: z.string().min(3, 'Round name must be at least 3 characters'),
  target: z.coerce
    .number({ error: 'Target amount is required' })
    .positive('Target amount must be greater than 0')
})

interface CreditCallTermsSchemaContext {
  /** Today's date, YYYY-MM-DD — floors the date part of the deadline. Callers should
   *  derive both this and `now` from the same instant (ideally the chain's own block
   *  time, plus a confirmation buffer — see CreditCallTermsStep.vue), not a bare device
   *  clock read, since FixedReturn.sol itself now rejects a subscriptionDeadline that
   *  isn't strictly in the future. */
  today: string
  /** Current instant (already padded with whatever confirmation buffer the caller
   *  wants) — floors a same-day deadline's clock time too, now that the deadline
   *  picker allows minute precision. Optional so callers that only care about the
   *  date-level check (or existing tests) can omit it. */
  now?: Date
}

/** Deadline/term rules, since Credit's rate field lives in the Terms step rather than
 *  Basics — scoped to exactly the fields CreditCallTermsStep.vue owns. Rate deliberately
 *  allows 0 here — an interest-free round is a valid Community Credit use case and the
 *  contract places no floor on interestRateBps.
 *  Cap validation belongs to CreditCallAccessStep.vue (where the cap fields actually
 *  live in Credit's step layout) and is handled separately, not here.
 *  `period` is always resolved to whole minutes before it reaches this schema (see
 *  `addCreditTerm`), regardless of which unit the issuer entered it in — FixedReturn.sol
 *  itself places no upper bound on the resulting maturityDate, only that it comes after
 *  subscriptionDeadline, so this cap (`CREDIT_TERM_MAX_YEARS`) is a UI-only sanity
 *  ceiling. The over-cap error is a superRefine rather than a plain `.max()` so it can
 *  quote back the issuer's own entry as a calendar breakdown (e.g. "35 years, 2
 *  months exceeds the 30-year maximum") instead of a bare, hard-to-place minute count. */
export function createCreditCallTermsSchema(context: CreditCallTermsSchemaContext) {
  return z
    .object({
      rate: z.coerce
        .number({ error: 'Interest rate is required' })
        .min(0, 'Rate cannot be negative')
        .max(100, 'Rate must be 100% or less'),
      deadline: z.string().min(1, 'Subscription deadline is required'),
      deadlineTime: z.string().optional(),
      period: z
        .number({ error: 'Term is required' })
        .int('Term must be a whole number')
        .positive('Term must be greater than 0')
    })
    .refine((data) => data.deadline >= context.today, {
      message: 'Subscription deadline cannot be in the past',
      path: ['deadline']
    })
    .refine(
      (data) => {
        if (!context.now || !data.deadlineTime) return true
        // Only the same-day case needs the clock-time check — an earlier refine
        // already rejects any past date outright.
        if (data.deadline !== context.today) return true
        return new Date(`${data.deadline}T${data.deadlineTime}:00Z`) >= context.now
      },
      {
        message: 'Subscription deadline must be a little further in the future',
        path: ['deadlineTime']
      }
    )
    .superRefine((data, ctx) => {
      if (!data.deadline) return
      // Compare against the real calendar span for CREDIT_TERM_MAX_YEARS, anchored on
      // the same deadline the issuer picked — not a flat days-per-year constant. A real
      // 30-year span almost always contains several leap days (e.g. 8, for a span
      // starting 2026-07-31), so a flat `30 * 365` comparison rejected the exact "30
      // years" a user enters via the Years unit, which `addCreditTerm` itself resolves
      // the calendar-real way. Anchoring both sides identically is what makes the
      // boundary actually inclusive, as the error message below promises.
      const deadlineTime = data.deadlineTime ?? ''
      const anchorSeconds = addCreditTerm(data.deadline, deadlineTime, 0, 'years')
      const maxSeconds = addCreditTerm(data.deadline, deadlineTime, CREDIT_TERM_MAX_YEARS, 'years')
      const maxMinutes = Math.round((maxSeconds - anchorSeconds) / 60)
      if (data.period <= maxMinutes) return
      const entered = formatCalendarBreakdown(data.deadline, deadlineTime, data.period)
      ctx.addIssue({
        code: 'custom',
        path: ['period'],
        message: `Term of ${entered} exceeds the ${CREDIT_TERM_MAX_YEARS}-year maximum`
      })
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

interface RepaymentAmountValidationContext {
  amount: string | number
  decimals: number
  outstanding: bigint
  treasuryBalance: bigint | null
}

export type RepaymentAmountValidationResult =
  | { valid: true; amountUnits: bigint; isFullRepayment: boolean }
  | { valid: false; errorMessage: string }

/**
 * Validates a repayment in token base units so the portal applies the same ceilings as
 * FixedReturn.sol without rounding a user-entered amount through JavaScript numbers.
 */
export function validateRepaymentAmount({
  amount,
  decimals,
  outstanding,
  treasuryBalance
}: RepaymentAmountValidationContext): RepaymentAmountValidationResult {
  if (treasuryBalance === null) {
    return { valid: false, errorMessage: 'Treasury balance is still loading.' }
  }

  const normalizedAmount = String(amount).trim()
  const decimalPart = normalizedAmount.split('.')[1]
  if (
    !/^\d+(?:\.\d+)?$/.test(normalizedAmount) ||
    (decimalPart !== undefined && decimalPart.length > decimals)
  ) {
    return { valid: false, errorMessage: 'Enter a valid token amount.' }
  }

  let amountUnits: bigint
  try {
    amountUnits = parseUnits(normalizedAmount, decimals)
  } catch {
    return { valid: false, errorMessage: 'Enter a valid token amount.' }
  }

  if (amountUnits <= 0n) {
    return { valid: false, errorMessage: 'Amount must be greater than 0.' }
  }
  if (outstanding <= 0n) {
    return { valid: false, errorMessage: 'This round has no outstanding balance.' }
  }
  if (amountUnits > outstanding) {
    return { valid: false, errorMessage: 'Cannot exceed the outstanding balance.' }
  }
  if (amountUnits > treasuryBalance) {
    return { valid: false, errorMessage: 'Cannot exceed the treasury balance.' }
  }

  return {
    valid: true,
    amountUnits,
    isFullRepayment: amountUnits === outstanding
  }
}

interface LendAmountSchemaContext {
  /** The tighter of the round's remaining funding gap and the lender's own remaining
   *  whitelist allocation/general cap — same figure already shown in the modal's
   *  "Remaining"/"Your cap left" tile (`CreditLendModal.vue`'s `displayRemaining`). */
  remaining: number
  tokenSymbol?: string
}

export function createLendAmountSchema({
  remaining,
  tokenSymbol = 'Token'
}: LendAmountSchemaContext) {
  return z.object({
    amount: z
      .number()
      .positive('Amount must be greater than 0.')
      .refine((value) => value <= remaining, {
        message: `Cannot exceed remaining amount of ${formatAmountWithPrecision(remaining, 0, 4)} ${tokenSymbol}.`
      })
  })
}
