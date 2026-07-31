/**
 * The Community Credit timeline — the four FixedReturn event feeds plus the
 * synthetic interest recognition, normalized into one list and replayed forwards.
 *
 * {@link ./fixedReturn} turns this timeline into postings; the running principal
 * and interest balances it keeps only hold if the lifecycle is walked in order,
 * which is exactly what this module guarantees. Split out so the mapper is left
 * with the bookkeeping alone.
 */
import type {
  FixedReturnLendingOfferCreatedRow,
  FixedReturnFundsLentRow,
  FixedReturnLendingOfferFundedRow,
  FixedReturnLenderRepaidRow,
  FixedReturnPrincipalRefundedRow
} from '@/types/ponder/fixedReturn'

/**
 * A funded round's economics, read from `getLendingOffer`. Only the rate is
 * needed: the contract's obligation is flat, so the maturity date changes nothing
 * about what is owed — it is a display concern the credit views read for
 * themselves, not an accounting input.
 */
export interface CreditOfferTerms {
  /** Offer id, as the event feed spells it (decimal string). */
  offerId: string
  /** Flat rate over the whole term, in basis points (800 = 8%). */
  interestRateBps: number
}

export interface FixedReturnMapperInput {
  /** Offer creations — the offer → token index every other event needs. */
  lendingOfferCreateds?: readonly FixedReturnLendingOfferCreatedRow[]
  lendingOfferFundeds?: readonly FixedReturnLendingOfferFundedRow[]
  fundsLents?: readonly FixedReturnFundsLentRow[]
  lenderRepaids?: readonly FixedReturnLenderRepaidRow[]
  principalRefundeds?: readonly FixedReturnPrincipalRefundedRow[]
  /** Rate per offer, read from the contract — what the interest is computed from. */
  offerTerms?: readonly CreditOfferTerms[]
}

/** `interest` is synthetic — it has no on-chain event behind it. */
type CreditEventKind = 'lent' | 'funded' | 'interest' | 'refunded' | 'repaid'

export interface CreditEvent {
  kind: CreditEventKind
  id: string
  offerId: string
  timestamp: number
  /** Absent only on `funded`, which carries the whole round. */
  lender?: string
  /** Absent on `funded`, whose amount is the principal accumulated so far. */
  amount?: string
}

/**
 * Tie-break for events sharing a timestamp — they share a *transaction*:
 * `lendFunds` emits `FundsLent` then `LendingOfferFunded`, and `refundLenders`
 * emits every `PrincipalRefunded` in one call. Replaying in emission order keeps
 * the running principal correct (a deposit must be counted before the sweep that
 * moves it). Log index would say the same, but the row ids are strings and would
 * sort `10` before `9`. The interest lands right after the sweep that raised it,
 * and before any repayment that could draw it down.
 */
const KIND_ORDER: Record<CreditEventKind, number> = {
  lent: 0,
  funded: 1,
  interest: 2,
  refunded: 3,
  repaid: 4
}

/** Parse a stringified base-unit amount, tolerating a malformed value. */
export function toBigInt(raw: string | undefined): bigint {
  try {
    return BigInt(raw ?? '0')
  } catch {
    return 0n
  }
}

/**
 * Every lender's cumulative deposit on a round by the time it funded, in the order
 * they first lent — the same order `s_offerLenders` keeps on-chain, which is what
 * decides who absorbs the rounding remainder below.
 */
function depositsAtFunding(
  input: FixedReturnMapperInput,
  offerId: string,
  fundedAt: number
): Array<{ lender: string; deposit: bigint }> {
  const byLender = new Map<string, { lender: string; deposit: bigint }>()
  for (const row of input.fundsLents ?? []) {
    if (row.offerId !== offerId || row.timestamp > fundedAt) continue
    const key = row.lender.toLowerCase()
    const seen = byLender.get(key)
    if (seen) seen.deposit += toBigInt(row.amount)
    else byLender.set(key, { lender: row.lender, deposit: toBigInt(row.amount) })
  }
  return [...byLender.values()]
}

/**
 * The fixed return a funded round owes, booked at the instant it funds — one
 * posting **per lender**, so the journal says who is owed what rather than
 * carrying a single anonymous figure for the whole round.
 *
 * `FixedReturn.sol` fixes the obligation the moment the round closes —
 * `totalObligation = totalFunded + totalFunded × interestRateBps / 10_000` — and
 * never prorates it: repaying on day two still costs the full flat fee. So the
 * whole return is a liability from that instant, not something earned as the term
 * runs, and it is recognised there rather than spread across the term.
 *
 * The per-lender split mirrors `totalEntitlementOf` exactly: each share is
 * `floor(totalObligation × deposit / totalFunded)` and the last lender in deposit
 * order takes the remainder, so the shares foot to the flat fee to the base unit —
 * the same figures the contract will actually pay out.
 */
function interestEvents(input: FixedReturnMapperInput): CreditEvent[] {
  const termsByOffer = new Map((input.offerTerms ?? []).map((t) => [t.offerId, t]))
  if (termsByOffer.size === 0) return []

  return (input.lendingOfferFundeds ?? []).flatMap((funded) => {
    const bps = termsByOffer.get(funded.offerId)?.interestRateBps
    if (!bps || bps <= 0) return []

    const lenders = depositsAtFunding(input, funded.offerId, funded.timestamp)
    const totalFunded = lenders.reduce((sum, l) => sum + l.deposit, 0n)
    if (totalFunded <= 0n) return []
    const obligation = totalFunded + (totalFunded * BigInt(Math.round(bps))) / 10_000n

    let allocated = 0n
    return lenders.flatMap(({ lender, deposit }, i) => {
      const last = i === lenders.length - 1
      const entitlement = last ? obligation - allocated : (obligation * deposit) / totalFunded
      allocated += entitlement
      const interest = entitlement - deposit
      if (interest <= 0n) return []

      return [
        {
          kind: 'interest' as const,
          // Keyed by the round and the lender alone — the id never moves, so the
          // row keeps its identity across refetches, exports and drill-downs.
          id: `credit-interest-${funded.offerId}-${lender.toLowerCase()}`,
          offerId: funded.offerId,
          timestamp: funded.timestamp,
          lender,
          amount: interest.toString()
        }
      ]
    })
  })
}

/** Every credit event of every round, oldest first. */
export function creditTimeline(input: FixedReturnMapperInput): CreditEvent[] {
  return [
    ...(input.fundsLents ?? []).map((row) => ({
      kind: 'lent' as const,
      id: row.id,
      offerId: row.offerId,
      timestamp: row.timestamp,
      lender: row.lender,
      amount: row.amount
    })),
    ...(input.lendingOfferFundeds ?? []).map((row) => ({
      kind: 'funded' as const,
      id: row.id,
      offerId: row.offerId,
      timestamp: row.timestamp
    })),
    ...(input.lenderRepaids ?? []).map((row) => ({
      kind: 'repaid' as const,
      id: row.id,
      offerId: row.offerId,
      timestamp: row.timestamp,
      lender: row.lender,
      amount: row.amount
    })),
    ...(input.principalRefundeds ?? []).map((row) => ({
      kind: 'refunded' as const,
      id: row.id,
      offerId: row.offerId,
      timestamp: row.timestamp,
      lender: row.lender,
      amount: row.amount
    })),
    ...interestEvents(input)
  ].sort((a, b) => a.timestamp - b.timestamp || KIND_ORDER[a.kind] - KIND_ORDER[b.kind])
}
