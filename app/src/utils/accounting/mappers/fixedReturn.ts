/**
 * FixedReturn (Community Credit) source mapper — the team **borrows** from its
 * lenders and repays them principal + a fixed return.
 *
 * The money-moving events of the contract, in lifecycle order:
 *
 *   `FundsLent`         UC-CREDIT-01  Dr Cash — Credit    · Cr Loan Payable
 *   `LendingOfferFunded`UC-CREDIT-02  Dr Cash — Bank      · Cr Cash — Credit   (internal)
 *   (no event)          UC-CREDIT-05  Dr Interest Expense · Cr Interest Payable (the fee owed)
 *   `LenderRepaid`      UC-CREDIT-03  Dr Loan Payable     · Cr Cash — Bank     (principal leg)
 *                                     Dr Interest Payable · Cr Cash — Bank     (interest leg)
 *   `PrincipalRefunded` UC-CREDIT-04  Dr Loan Payable     · Cr Cash — Credit
 *
 * Why each side is what it is:
 * - Lender deposits accumulate **in the FixedReturn contract** while the offer is
 *   Open, so they land in that contract's own cash pocket (`Cash — Credit`) and
 *   raise a liability — borrowed money is never revenue.
 * - On the deposit that hits the funding target (or on `acceptPartialFunding`,
 *   which emits `LendingOfferFunded` too) the whole principal is swept to Bank
 *   with a raw `safeTransfer`, which emits **no Bank event** — so the internal
 *   move is booked here, from the credit side, and has no Bank-side twin.
 * - Repayment runs `Bank → FixedReturn → lender` inside a single transaction
 *   (`Bank.fundFixedReturnRepayment`, whose `FixedReturnRepaymentFunded` is not in
 *   the Bank feed). The contract keeps no balance across it, so each `LenderRepaid`
 *   credits `Cash — Bank` directly — booking the intermediate hop as well would
 *   double-count the cash out.
 *
 * **Interest is recognised when the round funds, not when the cash leaves.** The
 * contract fixes the whole obligation at that instant — `totalFunded × (1 + rate)`
 * — and never prorates it: repaying on day two still costs the full flat fee. So
 * the fixed return is a liability from the moment the round closes, booked against
 * `Interest Payable` (`UC-CREDIT-05`) **one posting per lender**, so the journal
 * reads who is owed what, and the balance sheet shows the real debt (principal
 * *and* fee) for as long as it is outstanding. Spreading it across the term would
 * understate what is owed every day until maturity.
 *
 * A repayment then draws that liability down; only a fee that was never recognised
 * — because the round's rate was unavailable — falls through to `Interest Expense`
 * at payment time. Either way the total cost booked is exactly what the lenders
 * were paid. The rate travels on `LendingOfferCreated` but not through the mapper's
 * feed, so recognition happens only when `offerTerms` is supplied (see `assemble`).
 *
 * Splitting a repayment installment: `repayLenders` distributes cumulatively and
 * makes no principal/interest distinction, so the split is reconstructed here —
 * a lender's payments retire their principal first (Dr Loan Payable), and
 * everything beyond it is the fixed return. That leaves `Loan Payable` at exactly
 * zero once a lender has been made whole.
 *
 * Lifecycle events that move no money (`LendingOfferCreated`,
 * `LendingOfferRefundable`, `PartialFundingAccepted`, `RepaymentDistributed`,
 * `TokenSupportAdded/Removed`, `OwnershipTransferred`) produce no entry;
 * `LendingOfferCreated` is still consumed, for the offer → token index. The two
 * aggregate events (`RefundsDistributed` / `RepaymentDistributed`) are exactly
 * the sum of their per-lender events, so booking them too would double-count.
 */
import type { TokenId } from '@/constant'
import { makeEntry, type LedgerEntry } from '@/utils/accounting/ledgerEntry'
import {
  creditTimeline,
  toBigInt,
  type CreditEvent,
  type FixedReturnMapperInput
} from './creditTimeline'
import { atDate, type MapperContext } from './context'

export type { CreditOfferTerms, FixedReturnMapperInput } from './creditTimeline'

const CREDIT = 'Cash — Credit' as const
const BANK = 'Cash — Bank' as const
const LOAN_PAYABLE = 'Loan Payable' as const
const INTEREST_PAYABLE = 'Interest Payable' as const
const INTEREST_EXPENSE = 'Interest Expense' as const

/** `${offerId}|${lender}` — keys a lender's position within one offer. */
function positionKey(offerId: string, lender: string): string {
  return `${offerId}|${lender.toLowerCase()}`
}

/** Read-modify-write helper for the running per-key bigint balances. */
function bump(balances: Map<string, bigint>, key: string, delta: bigint): void {
  balances.set(key, (balances.get(key) ?? 0n) + delta)
}

/**
 * Map the FixedReturn feed to ledger entries by replaying the credit lifecycle.
 *
 * An offer whose `LendingOfferCreated` is missing from the feed cannot be valued:
 * that event is the only carrier of the offer's token, and posting a base-unit
 * amount against a guessed token would put a wildly wrong USD figure in the books.
 * Rather than drop it silently, the round gets a single **memo** entry (no
 * monetary legs, so the trial balance is untouched) naming what is unaccounted
 * for. The feed is scanned from the contract's deploy block, so in practice this
 * only fires when the RPC window truncated the history.
 */
export function mapFixedReturnEvents(
  input: FixedReturnMapperInput,
  ctx: MapperContext
): LedgerEntry[] {
  const tokenByOffer = new Map<string, TokenId>()
  for (const row of input.lendingOfferCreateds ?? []) {
    tokenByOffer.set(row.offerId, ctx.tokenIdOf(row.token))
  }

  /** Principal sitting in the contract for an offer, not yet swept or refunded. */
  const heldByOffer = new Map<string, bigint>()
  /** Principal a lender has outstanding on an offer — what repayment retires first. */
  const owedToLender = new Map<string, bigint>()
  /** The `Interest Payable` a lender is still owed on an offer — what the interest
   *  side of their repayment clears, the mirror of `owedToLender` for principal. */
  const payableToLender = new Map<string, bigint>()
  /** Offers already flagged as unvaluable — one memo each, not one per event. */
  const unvalued = new Set<string>()

  const entries: LedgerEntry[] = []

  for (const event of creditTimeline(input)) {
    const token = tokenByOffer.get(event.offerId)
    if (!token) {
      if (!unvalued.has(event.offerId)) {
        unvalued.add(event.offerId)
        entries.push(unvaluedOfferMemo(event))
      }
      continue
    }
    const at = atDate(event.timestamp)
    const usd = (raw: bigint): number => ctx.toUsd(raw, token, at)
    const key = event.lender ? positionKey(event.offerId, event.lender) : ''

    switch (event.kind) {
      case 'lent': {
        const amount = toBigInt(event.amount)
        if (amount <= 0n) break
        bump(heldByOffer, event.offerId, amount)
        bump(owedToLender, key, amount)
        entries.push(
          makeEntry({
            id: event.id,
            timestamp: event.timestamp,
            useCase: 'UC-CREDIT-01',
            debit: CREDIT,
            credit: LOAN_PAYABLE,
            amountUsd: usd(amount),
            token,
            rawAmount: amount.toString(),
            counterparty: event.lender,
            creditOfferId: event.offerId,
            memo: `Funds lent to Community Credit offer #${event.offerId}`
          })
        )
        break
      }

      case 'funded': {
        // The whole principal raised so far leaves the contract for Bank in the
        // same transaction — both sides are CNC pockets, so it is an internal move.
        const swept = heldByOffer.get(event.offerId) ?? 0n
        if (swept <= 0n) break
        heldByOffer.set(event.offerId, 0n)
        entries.push(
          makeEntry({
            id: event.id,
            timestamp: event.timestamp,
            useCase: 'UC-CREDIT-02',
            debit: BANK,
            credit: CREDIT,
            amountUsd: usd(swept),
            token,
            rawAmount: swept.toString(),
            internal: true,
            memo: `Community Credit offer #${event.offerId} principal swept to Bank`
          })
        )
        break
      }

      case 'interest': {
        // The round has closed, so the whole flat fee is owed from this instant —
        // one posting per lender, at the funding date, for the share they will be
        // paid on top of their principal.
        const owed = toBigInt(event.amount)
        if (owed <= 0n) break
        bump(payableToLender, key, owed)
        entries.push(
          makeEntry({
            id: event.id,
            timestamp: event.timestamp,
            useCase: 'UC-CREDIT-05',
            debit: INTEREST_EXPENSE,
            credit: INTEREST_PAYABLE,
            amountUsd: usd(owed),
            token,
            rawAmount: owed.toString(),
            counterparty: event.lender,
            creditOfferId: event.offerId,
            memo: `Fixed return owed to a lender on Community Credit offer #${event.offerId}`
          })
        )
        break
      }

      case 'repaid': {
        const amount = toBigInt(event.amount)
        if (amount <= 0n) break
        const outstanding = owedToLender.get(key) ?? 0n
        const principal = amount < outstanding ? amount : outstanding
        if (principal > 0n) {
          owedToLender.set(key, outstanding - principal)
          entries.push(
            makeEntry({
              id: legId(event.id, 'principal'),
              timestamp: event.timestamp,
              useCase: 'UC-CREDIT-03',
              debit: LOAN_PAYABLE,
              credit: BANK,
              amountUsd: usd(principal),
              token,
              rawAmount: principal.toString(),
              counterparty: event.lender,
              creditOfferId: event.offerId,
              memo: `Principal repaid on Community Credit offer #${event.offerId}`
            })
          )
        }
        entries.push(...interestLegs(event, amount - principal, key, payableToLender, token, usd))
        break
      }

      case 'refunded': {
        // The offer missed its target: the principal never left the contract, so
        // it goes straight back to the lender and clears the liability.
        const amount = toBigInt(event.amount)
        if (amount <= 0n) break
        bump(heldByOffer, event.offerId, -amount)
        bump(owedToLender, key, -amount)
        entries.push(
          makeEntry({
            id: event.id,
            timestamp: event.timestamp,
            useCase: 'UC-CREDIT-04',
            debit: LOAN_PAYABLE,
            credit: CREDIT,
            amountUsd: usd(amount),
            token,
            rawAmount: amount.toString(),
            counterparty: event.lender,
            creditOfferId: event.offerId,
            memo: `Principal refunded on unfunded Community Credit offer #${event.offerId}`
          })
        )
        break
      }
    }
  }

  return entries
}

/**
 * A repayment leg's id. The suffix goes **after** the `${txHash}-${logIndex}`
 * event id, which `txHashOf` reads past by matching the leading hash, so both
 * legs still resolve to the transaction they were paid in.
 */
function legId(eventId: string, leg: string): string {
  return `${eventId}-${leg}`
}

/**
 * The interest side of one repayment installment: it clears what **this lender**
 * was recognised as owed when the round funded, and only a fee never recognised
 * there — the round's rate was unavailable, so nothing was booked — falls through
 * to `Interest Expense`. With no terms at all the payable is empty and every cent
 * takes the second leg, which is the cash-basis treatment this mapper started with.
 */
function interestLegs(
  event: CreditEvent,
  interest: bigint,
  key: string,
  payableToLender: Map<string, bigint>,
  token: TokenId,
  usd: (raw: bigint) => number
): LedgerEntry[] {
  if (interest <= 0n) return []
  const payable = payableToLender.get(key) ?? 0n
  const fromPayable = interest < payable ? interest : payable
  const unrecognised = interest - fromPayable
  const legs: LedgerEntry[] = []

  const leg = (id: string, debit: typeof INTEREST_PAYABLE | typeof INTEREST_EXPENSE, raw: bigint) =>
    makeEntry({
      id: legId(event.id, id),
      timestamp: event.timestamp,
      useCase: 'UC-CREDIT-03' as const,
      debit,
      credit: BANK,
      amountUsd: usd(raw),
      token,
      rawAmount: raw.toString(),
      counterparty: event.lender,
      creditOfferId: event.offerId,
      memo: `Fixed return paid on Community Credit offer #${event.offerId}`
    })

  if (fromPayable > 0n) {
    payableToLender.set(key, payable - fromPayable)
    legs.push(leg('interest', INTEREST_PAYABLE, fromPayable))
  }
  if (unrecognised > 0n) legs.push(leg('interest-unrecognised', INTEREST_EXPENSE, unrecognised))
  return legs
}

/**
 * The memo standing in for a round whose token could not be resolved — it names
 * the gap in the journal instead of leaving a hole nothing explains. Memo-only
 * (both legs `null`, `$0`), so no statement and no trial balance is disturbed.
 */
function unvaluedOfferMemo(event: CreditEvent): LedgerEntry {
  return makeEntry({
    id: `credit-unvalued-${event.offerId}`,
    timestamp: event.timestamp,
    useCase: 'UC-CREDIT-01',
    debit: null,
    credit: null,
    amountUsd: 0,
    token: 'native',
    rawAmount: '0',
    enrichment: 'needs-off-chain-data',
    memo: `Community Credit offer #${event.offerId} could not be valued — its creation event is missing from the feed`
  })
}
