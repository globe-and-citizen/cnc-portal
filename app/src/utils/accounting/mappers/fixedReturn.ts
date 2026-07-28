/**
 * FixedReturn (Community Credit) source mapper — the team **borrows** from its
 * lenders and repays them principal + a fixed return.
 *
 * The four money-moving events of the contract, in lifecycle order:
 *
 *   `FundsLent`         UC-CREDIT-01  Dr Cash — Credit    · Cr Loan Payable
 *   `LendingOfferFunded`UC-CREDIT-02  Dr Cash — Bank      · Cr Cash — Credit   (internal)
 *   `LenderRepaid`      UC-CREDIT-03  Dr Loan Payable     · Cr Cash — Bank     (principal leg)
 *                                     Dr Interest Expense · Cr Cash — Bank     (interest leg)
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
 * Splitting a repayment installment: `repayLenders` distributes cumulatively and
 * makes no principal/interest distinction, so the split is reconstructed here —
 * a lender's payments retire their principal first (Dr Loan Payable), and
 * everything beyond it is the fixed return (Dr Interest Expense). That leaves
 * `Loan Payable` at exactly zero once a lender has been made whole.
 *
 * Lifecycle events that move no money (`LendingOfferCreated`,
 * `LendingOfferRefundable`, `PartialFundingAccepted`, `RepaymentDistributed`,
 * `TokenSupportAdded/Removed`, `OwnershipTransferred`) produce no entry;
 * `LendingOfferCreated` is still consumed, for the offer → token index. The two
 * aggregate events (`RefundsDistributed` / `RepaymentDistributed`) are exactly
 * the sum of their per-lender events, so booking them too would double-count.
 */
import type {
  FixedReturnLendingOfferCreatedRow,
  FixedReturnFundsLentRow,
  FixedReturnLendingOfferFundedRow,
  FixedReturnLenderRepaidRow,
  FixedReturnPrincipalRefundedRow
} from '@/types/ponder/fixedReturn'
import type { TokenId } from '@/constant'
import { makeEntry, type LedgerEntry } from '@/utils/accounting/ledgerEntry'
import { atDate, type MapperContext } from './context'

export interface FixedReturnMapperInput {
  /** Offer creations — the offer → token index every other event needs. */
  lendingOfferCreateds?: readonly FixedReturnLendingOfferCreatedRow[]
  lendingOfferFundeds?: readonly FixedReturnLendingOfferFundedRow[]
  fundsLents?: readonly FixedReturnFundsLentRow[]
  lenderRepaids?: readonly FixedReturnLenderRepaidRow[]
  principalRefundeds?: readonly FixedReturnPrincipalRefundedRow[]
}

const CREDIT = 'Cash — Credit' as const
const BANK = 'Cash — Bank' as const
const LOAN_PAYABLE = 'Loan Payable' as const

/**
 * One event of the credit timeline, normalized so the four feeds can be replayed
 * in chronological order — the running principal balances below only hold if the
 * lifecycle is walked forwards.
 */
type CreditEventKind = 'lent' | 'funded' | 'repaid' | 'refunded'

interface CreditEvent {
  kind: CreditEventKind
  id: string
  offerId: string
  timestamp: number
  /** Absent on `funded`, which carries only the offer id. */
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
 * sort `10` before `9`.
 */
const KIND_ORDER: Record<CreditEventKind, number> = {
  lent: 0,
  funded: 1,
  refunded: 2,
  repaid: 3
}

function chronological(events: CreditEvent[]): CreditEvent[] {
  return events.sort((a, b) => a.timestamp - b.timestamp || KIND_ORDER[a.kind] - KIND_ORDER[b.kind])
}

/** Parse a stringified base-unit amount, tolerating a malformed value. */
function toBigInt(raw: string | undefined): bigint {
  try {
    return BigInt(raw ?? '0')
  } catch {
    return 0n
  }
}

/** `${offerId}|${lender}` — keys a lender's position within one offer. */
function positionKey(offerId: string, lender: string): string {
  return `${offerId}|${lender.toLowerCase()}`
}

/** Read-modify-write helper for the running per-key bigint balances. */
function bump(balances: Map<string, bigint>, key: string, delta: bigint): void {
  balances.set(key, (balances.get(key) ?? 0n) + delta)
}

/** Flatten the per-event feeds into one chronological timeline. */
function toTimeline(input: FixedReturnMapperInput): CreditEvent[] {
  return chronological([
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
    }))
  ])
}

/**
 * Map the FixedReturn feed to ledger entries by replaying the credit lifecycle.
 *
 * An offer whose `LendingOfferCreated` is missing from the feed is **skipped**:
 * that event is the only carrier of the offer's token, and valuing a base-unit
 * amount against a guessed token would post a wildly wrong USD figure. The feed
 * is scanned from the contract's deploy block, so in practice it is always there.
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

  const entries: LedgerEntry[] = []

  for (const event of toTimeline(input)) {
    const token = tokenByOffer.get(event.offerId)
    if (!token) continue
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

      // The two legs suffix the source id, which puts them out of reach of
      // `txHashOf` (it parses `${txHash}-${logIndex}`). Harmless today — they
      // credit Cash — Bank, but `Bank.fundFixedReturnRepayment` skims no protocol
      // fee, so there is never a fee to fold in. Revisit if that ever changes.
      case 'repaid': {
        const amount = toBigInt(event.amount)
        if (amount <= 0n) break
        const outstanding = owedToLender.get(key) ?? 0n
        const principal = amount < outstanding ? amount : outstanding
        const interest = amount - principal
        if (principal > 0n) {
          owedToLender.set(key, outstanding - principal)
          entries.push(
            makeEntry({
              id: `${event.id}-principal`,
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
        if (interest > 0n) {
          entries.push(
            makeEntry({
              id: `${event.id}-interest`,
              timestamp: event.timestamp,
              useCase: 'UC-CREDIT-03',
              debit: 'Interest Expense',
              credit: BANK,
              amountUsd: usd(interest),
              token,
              rawAmount: interest.toString(),
              counterparty: event.lender,
              memo: `Fixed return paid on Community Credit offer #${event.offerId}`
            })
          )
        }
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
