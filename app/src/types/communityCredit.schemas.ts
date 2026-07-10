import { z } from 'zod'
import { OFFERING_TERM_MAXIMUMS, sumWhitelistAmount } from '@/utils'

/** Mirrors FixedReturn's offeringBasicsSchema (offering.schemas.ts) — same underlying
 *  contract, same rules — adapted to CreditCallForm's string-typed form fields. */
export const creditCallBasicsSchema = z.object({
  name: z.string().min(3, 'Round name must be at least 3 characters'),
  target: z.coerce
    .number({ error: 'Target amount is required' })
    .positive('Target amount must be greater than 0')
})

interface CreditCallTermsSchemaContext {
  today: string
}

/** Mirrors FixedReturn's createOfferingTermsSchema (deadline/term rules) merged with
 *  offeringBasicsSchema's rate rule, since Credit's rate field lives in the Terms step
 *  rather than Basics — scoped to exactly the fields CreditCallTermsStep.vue owns.
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
        .positive('Rate must be greater than 0')
        .max(100, 'Rate must be 100% or less'),
      deadline: z.string().min(1, 'Subscription deadline is required'),
      period: z
        .number({ error: 'Term is required' })
        .int('Term must be a whole number')
        .positive('Term must be greater than 0')
        .max(OFFERING_TERM_MAXIMUMS.days, `Term cannot exceed ${OFFERING_TERM_MAXIMUMS.days} days`)
    })
    .refine((data) => data.deadline >= context.today, {
      message: 'Subscription deadline cannot be in the past',
      path: ['deadline']
    })
}

interface CreditCallAccessSchemaContext {
  /** The round's target amount — whitelist allocations and the cap are checked against this. */
  target: number
}

/** Mirrors FixedReturn's createOfferingAccessSchema exactly — same searchable,
 *  per-lender custom-amount whitelist (WhitelistEntry[]), the same allocation-vs-target
 *  and per-entry-vs-cap rules. Only the cap-required/cap-≤-target checks are extra here,
 *  since Credit's cap fields live in this step rather than a separate Terms step. */
export function createCreditCallAccessSchema(context: CreditCallAccessSchemaContext) {
  return z
    .object({
      access: z.enum(['everyone', 'restricted']),
      whitelist: z.array(
        z.object({
          username: z.string(),
          address: z.string(),
          amount: z.number().nullable()
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
      (data) => data.access !== 'restricted' || data.whitelist.every((w) => w.amount != null),
      {
        message: 'Set an amount for every whitelisted lender before publishing',
        path: ['whitelist']
      }
    )
    .refine(
      (data) => {
        if (data.access !== 'restricted') return true
        const sum = sumWhitelistAmount(data.whitelist)
        // FixedReturn.sol only reverts if allocations exceed the target — it never
        // requires them to reach it. An under-allocated whitelist can still be
        // published on-chain, but can then never hit totalFunded >= fundingTarget,
        // so the round would sit Open forever until it's marked refundable. Until
        // the contract gains a way to add lenders after creation (or the team
        // decides to leave this looser), require an exact match up front instead.
        return Math.abs(sum - context.target) < 1e-6
      },
      {
        message: 'Whitelisted allocations must add up to exactly the target amount',
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
    .refine(
      (data) => {
        if (!data.capOn || typeof data.cap !== 'number') return true
        return data.whitelist.every((w) => w.amount == null || w.amount <= data.cap!)
      },
      { message: 'One or more lenders exceed the per-lender cap', path: ['cap'] }
    )
}
