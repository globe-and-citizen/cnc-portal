/**
 * FixedReturn (Community Credit) source mapper — the team **borrows** from its
 * lenders and repays them principal + a fixed return.
 *
 * The money-moving events of the contract, in lifecycle order:
 *
 *   `FundsLent`         UC-CREDIT-01  Dr Cash — Credit    · Cr Loan Payable
 *   `LendingOfferFunded`UC-CREDIT-02  Dr Cash — Bank      · Cr Cash — Credit   (internal)
 *   (no event)          UC-CREDIT-05  Dr Interest Expense · Cr Interest Payable (accrual)
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
 * **Interest is recognised as the term runs, not when the cash leaves.** The
 * contract charges a flat rate over the whole term and moves nothing until the
 * issuer repays, so {@link ./creditAccrual} spreads the fixed return month by
 * month from the funding date to maturity (`UC-CREDIT-05`), parking the unpaid
 * part in `Interest Payable`. A repayment then draws that liability down first
 * and only expenses what was not accrued yet — a round settled early, before its
 * term has run, books the remainder as `Interest Expense` on the spot. Either way
 * the total cost booked is exactly what the lenders were paid. Accrual needs the
 * round's rate and maturity date, which travel on neither event, so it happens
 * only when `offerTerms` is supplied (see `assemble`); without it the mapper falls
 * back to expensing the fixed return at payment time.
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

export type { CreditOfferTerms } from './creditAccrual'
export type { FixedReturnMapperInput } from './creditTimeline'

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
  /** Interest already taken to expense for an offer (accrued + settled early). */
  const expensedByOffer = new Map<string, bigint>()
  /** The `Interest Payable` balance an offer currently carries. */
  const payableByOffer = new Map<string, bigint>()
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

      case 'accrue': {
        // The schedule states the interest owed *cumulatively* by this date, so a
        // round settled ahead of its term simply has nothing left to book here.
        const target = event.accrued ?? 0n
        const expensed = expensedByOffer.get(event.offerId) ?? 0n
        const delta = target - expensed
        if (delta <= 0n) break
        expensedByOffer.set(event.offerId, target)
        bump(payableByOffer, event.offerId, delta)
        entries.push(
          makeEntry({
            id: event.id,
            timestamp: event.timestamp,
            useCase: 'UC-CREDIT-05',
            debit: INTEREST_EXPENSE,
            credit: INTEREST_PAYABLE,
            amountUsd: usd(delta),
            token,
            rawAmount: delta.toString(),
            memo: `Interest accrued on Community Credit offer #${event.offerId}`
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
              memo: `Principal repaid on Community Credit offer #${event.offerId}`
            })
          )
        }
        entries.push(
          ...interestLegs(event, amount - principal, payableByOffer, expensedByOffer, token, usd)
        )
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
 * The interest side of one repayment installment: it clears the `Interest Payable`
 * built up by the accrual first, and only what was never accrued — a round repaid
 * before its term has run — goes straight to `Interest Expense`. With no accrual
 * running at all (no offer terms), the payable is empty and every cent takes the
 * second leg, which is exactly the cash-basis treatment this mapper started with.
 */
function interestLegs(
  event: CreditEvent,
  interest: bigint,
  payableByOffer: Map<string, bigint>,
  expensedByOffer: Map<string, bigint>,
  token: TokenId,
  usd: (raw: bigint) => number
): LedgerEntry[] {
  if (interest <= 0n) return []
  const payable = payableByOffer.get(event.offerId) ?? 0n
  const fromPayable = interest < payable ? interest : payable
  const unaccrued = interest - fromPayable
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
      memo: `Fixed return paid on Community Credit offer #${event.offerId}`
    })

  if (fromPayable > 0n) {
    payableByOffer.set(event.offerId, payable - fromPayable)
    legs.push(leg('interest', INTEREST_PAYABLE, fromPayable))
  }
  if (unaccrued > 0n) {
    bump(expensedByOffer, event.offerId, unaccrued)
    legs.push(leg('interest-unaccrued', INTEREST_EXPENSE, unaccrued))
  }
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
