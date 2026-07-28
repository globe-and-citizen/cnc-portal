/**
 * The Community Credit timeline — the four FixedReturn event feeds plus the
 * synthetic interest accruals, normalized into one list and replayed forwards.
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
import { accrualSchedule, type CreditOfferTerms } from './creditAccrual'

export interface FixedReturnMapperInput {
  /** Offer creations — the offer → token index every other event needs. */
  lendingOfferCreateds?: readonly FixedReturnLendingOfferCreatedRow[]
  lendingOfferFundeds?: readonly FixedReturnLendingOfferFundedRow[]
  fundsLents?: readonly FixedReturnFundsLentRow[]
  lenderRepaids?: readonly FixedReturnLenderRepaidRow[]
  principalRefundeds?: readonly FixedReturnPrincipalRefundedRow[]
  /** Rate + maturity per offer, read from the contract — enables the accrual. */
  offerTerms?: readonly CreditOfferTerms[]
  /** "Now" for the accrual walk; defaults to the current time (injected in tests). */
  asOf?: Date
}

/** `accrue` is synthetic — it has no on-chain event behind it. */
export type CreditEventKind = 'lent' | 'funded' | 'accrue' | 'refunded' | 'repaid'

export interface CreditEvent {
  kind: CreditEventKind
  id: string
  offerId: string
  timestamp: number
  /** Absent on `funded` / `accrue`, which carry only the offer id. */
  lender?: string
  /** Absent on `funded`, whose amount is the principal accumulated so far. */
  amount?: string
  /** `accrue` only — interest owed cumulatively by this instant, base units. */
  accrued?: bigint
}

/**
 * Tie-break for events sharing a timestamp — they share a *transaction*:
 * `lendFunds` emits `FundsLent` then `LendingOfferFunded`, and `refundLenders`
 * emits every `PrincipalRefunded` in one call. Replaying in emission order keeps
 * the running principal correct (a deposit must be counted before the sweep that
 * moves it). Log index would say the same, but the row ids are strings and would
 * sort `10` before `9`. An accrual sorts before a repayment so a settlement can
 * draw down the interest earned up to that very instant.
 */
const KIND_ORDER: Record<CreditEventKind, number> = {
  lent: 0,
  funded: 1,
  accrue: 2,
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
 * The synthetic accrual points of every funded round. The principal a round
 * carries is what its lenders had deposited by the time it funded — the exact
 * amount the sweep moves — so the schedule is built from the same figure the
 * replay will book, without having to run the replay first.
 */
function accrualEvents(input: FixedReturnMapperInput): CreditEvent[] {
  const termsByOffer = new Map((input.offerTerms ?? []).map((t) => [t.offerId, t]))
  if (termsByOffer.size === 0) return []
  const asOf = input.asOf ?? new Date()

  return (input.lendingOfferFundeds ?? []).flatMap((funded) => {
    const principal = (input.fundsLents ?? [])
      .filter((row) => row.offerId === funded.offerId && row.timestamp <= funded.timestamp)
      .reduce((sum, row) => sum + toBigInt(row.amount), 0n)

    return accrualSchedule(principal, funded.timestamp, termsByOffer.get(funded.offerId), asOf).map(
      (point) => ({
        kind: 'accrue' as const,
        id: `credit-accrual-${funded.offerId}-${point.timestamp}`,
        offerId: funded.offerId,
        timestamp: point.timestamp,
        accrued: point.accrued
      })
    )
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
    ...accrualEvents(input)
  ].sort((a, b) => a.timestamp - b.timestamp || KIND_ORDER[a.kind] - KIND_ORDER[b.kind])
}
