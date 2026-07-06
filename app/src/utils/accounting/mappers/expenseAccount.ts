/**
 * ExpenseAccount source mapper — operating expense payouts (spec §4, UC-EXP-01).
 *
 * Expenses are **cash basis**: the cost is recognised when the money actually
 * leaves the pocket, not when the budget is approved. A member may draw an
 * approved budget over **several partial withdrawals**, so every on-chain
 * `Transfer` / `TokenTransfer` is booked on its own — Dr Operating Expense ·
 * Cr Cash — Expense — and its memo states how much of the budget is left after
 * that draw (or that the budget is now fully drawn), computed from the portal
 * `Expense` record's cap and the running total of prior draws.
 *
 * - `Transfer` / `TokenTransfer` to an external address: an approved expense
 *   payout, flagged `needs-off-chain-data` so enrichment can attach the
 *   `Expense` budget category. The counterparty is the **withdrawer** (the
 *   member the budget was approved for), so both the remaining-budget match and
 *   the off-chain join key on the right address. A transfer to an internal
 *   pocket is instead an internal move.
 * - `Deposited` / `TokenDeposited`: internal funding of the expense pocket from
 *   Bank — internal move.
 * - `OwnerTreasuryWithdraw*` (the `ownerWithdrawAllToBank` sweep): internal move
 *   back to Bank.
 */
import { formatUnits, parseUnits, zeroAddress } from 'viem'
import type { TokenId } from '@/constant'
import type {
  ExpenseDepositRow,
  ExpenseTokenDepositRow,
  ExpenseTransferRow,
  ExpenseTokenTransferRow,
  ExpenseOwnerTreasuryWithdrawNativeRow,
  ExpenseOwnerTreasuryWithdrawTokenRow
} from '@/types/ponder/expense'
import type { ExpenseResponse } from '@/types/expense-account'
import { getTokenAddress, getTokenDecimals, tokenSymbol } from '@/utils/constantUtil'
import { makeEntry, type LedgerEntry } from '@/utils/accounting/ledgerEntry'
import type { AccountName } from '@/utils/accounting/chartOfAccounts'
import { atDate, type MapperContext } from './context'

export interface ExpenseMapperInput {
  deposits?: readonly ExpenseDepositRow[]
  tokenDeposits?: readonly ExpenseTokenDepositRow[]
  transfers?: readonly ExpenseTransferRow[]
  tokenTransfers?: readonly ExpenseTokenTransferRow[]
  ownerTreasuryWithdrawNatives?: readonly ExpenseOwnerTreasuryWithdrawNativeRow[]
  ownerTreasuryWithdrawTokens?: readonly ExpenseOwnerTreasuryWithdrawTokenRow[]
}

const EXPENSE = 'Cash — Expense' as const
const BANK = 'Cash — Bank' as const

/** A pocket-to-pocket move that nets out of the income statement. */
function internalMove(
  row: { id: string; amount: string; timestamp: number },
  token: string | null,
  ctx: MapperContext,
  opts: { debit: AccountName; credit: AccountName; counterparty?: string; memo: string }
): LedgerEntry {
  const tokenId = ctx.tokenIdOf(token)
  return makeEntry({
    id: row.id,
    timestamp: row.timestamp,
    useCase: 'INTERNAL',
    debit: opts.debit,
    credit: opts.credit,
    amountUsd: ctx.toUsd(BigInt(row.amount), tokenId, atDate(row.timestamp)),
    token: tokenId,
    rawAmount: row.amount,
    counterparty: opts.counterparty,
    internal: true,
    memo: opts.memo
  })
}

/** An approved budget cap, normalized for remaining-balance tracking. */
interface BudgetCap {
  tokenId: TokenId
  /** Budget cap in base units. */
  capBase: bigint
  /** Approval time (record creation), Unix seconds. */
  approvedAt: number
  /** Running total already drawn against this budget, in base units. */
  drawnBase: bigint
}

/** Whole-token units → base units, or `null` when the value can't be parsed. */
function toBaseUnits(amount: number, decimals: number): bigint | null {
  if (!Number.isFinite(amount) || amount < 0) return null
  try {
    return parseUnits(amount.toFixed(decimals), decimals)
  } catch {
    return null
  }
}

/** Unix seconds of a portal date field, `0` when unparseable. */
function toSeconds(value: Date | string | undefined): number {
  const ms = new Date(value ?? NaN).getTime()
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : 0
}

/** Memo suffix stating a budget's remaining balance after a draw (or that it's used up). */
function remainingMemo(remainingBase: bigint, tokenId: TokenId): string {
  if (remainingBase <= 0n) return ' — budget fully drawn'
  const address = getTokenAddress(tokenId) ?? zeroAddress
  return ` — ${formatUnits(remainingBase, getTokenDecimals(tokenId))} ${tokenSymbol(address)} left`
}

/**
 * Tracks how much of each approved budget is left as its partial draws are
 * booked. A budget is keyed by `member:tokenId`; when several budgets exist for
 * the same key, a draw is attributed to the most recent one approved before it.
 *
 * Only **one-time** budgets (`frequencyType === 0`) are tracked: a recurring
 * budget's cap resets each window, so a running all-time total against a fixed
 * cap would report a bogus remainder — those payouts get no remaining note.
 */
class RemainingBudgetTracker {
  private readonly byMember = new Map<string, BudgetCap[]>()

  constructor(expenses: readonly ExpenseResponse[] | undefined, ctx: MapperContext) {
    for (const expense of expenses ?? []) {
      const data = expense.data
      if (!data || Number(data.frequencyType) !== 0) continue
      const member = String(data.approvedAddress ?? expense.userAddress ?? '').toLowerCase()
      if (!member) continue
      const tokenId = ctx.tokenIdOf(data.tokenAddress)
      const capBase = toBaseUnits(Number(data.amount), getTokenDecimals(tokenId))
      if (capBase === null || capBase <= 0n) continue
      const list = this.byMember.get(member) ?? []
      list.push({ tokenId, capBase, approvedAt: toSeconds(expense.createdAt), drawnBase: 0n })
      this.byMember.set(member, list)
    }
    // Newest-first so a draw picks the most recent budget approved before it.
    for (const list of this.byMember.values()) list.sort((a, b) => b.approvedAt - a.approvedAt)
  }

  /**
   * Book `amountBase` against the withdrawer's budget for `tokenId` and return
   * the memo suffix describing the remaining balance, or `''` when no matching
   * budget is on file (nothing to report against).
   */
  draw(withdrawer: string, tokenId: TokenId, timestamp: number, amountBase: bigint): string {
    const candidates = this.byMember.get(withdrawer.toLowerCase())
    const budget = candidates?.find((b) => b.tokenId === tokenId && b.approvedAt <= timestamp)
    if (!budget) return ''
    budget.drawnBase += amountBase
    return remainingMemo(budget.capBase - budget.drawnBase, tokenId)
  }
}

/** Map an approved payout (or an internal move when the recipient is a pocket). */
function mapTransfer(
  row: { id: string; withdrawer: string; to: string; amount: string; timestamp: number },
  token: string | null,
  ctx: MapperContext,
  tracker: RemainingBudgetTracker
): LedgerEntry {
  const destPocket = ctx.pocketOf(row.to)
  if (destPocket) {
    return internalMove(row, token, ctx, {
      debit: destPocket,
      credit: EXPENSE,
      counterparty: row.to,
      memo: `Internal move Expense → ${destPocket}`
    })
  }

  const tokenId = ctx.tokenIdOf(token)
  const amountBase = BigInt(row.amount)
  const paidElsewhere = row.to.toLowerCase() !== row.withdrawer.toLowerCase()
  const remaining = tracker.draw(row.withdrawer, tokenId, row.timestamp, amountBase)
  const base = paidElsewhere ? `Approved expense payout to ${row.to}` : 'Approved expense payout'
  return makeEntry({
    id: row.id,
    timestamp: row.timestamp,
    useCase: 'UC-EXP-01',
    debit: 'Operating Expense',
    credit: EXPENSE,
    amountUsd: ctx.toUsd(amountBase, tokenId, atDate(row.timestamp)),
    token: tokenId,
    rawAmount: row.amount,
    counterparty: row.withdrawer,
    memo: `${base}${remaining}`,
    enrichment: 'needs-off-chain-data'
  })
}

/**
 * Map every indexed ExpenseAccount event to ledger entries. The portal's
 * approved `expenses` supply each budget's cap so a partial payout can report
 * the remaining balance in its memo.
 */
export function mapExpenseAccountEvents(
  input: ExpenseMapperInput,
  ctx: MapperContext,
  expenses?: readonly ExpenseResponse[]
): LedgerEntry[] {
  const tracker = new RemainingBudgetTracker(expenses, ctx)
  const entries: LedgerEntry[] = []

  for (const row of input.deposits ?? []) {
    entries.push(
      internalMove(row, null, ctx, {
        debit: EXPENSE,
        credit: ctx.pocketOf(row.depositor) ?? BANK,
        counterparty: row.depositor,
        memo: 'Internal funding into Expense'
      })
    )
  }

  for (const row of input.tokenDeposits ?? []) {
    entries.push(
      internalMove(row, row.token, ctx, {
        debit: EXPENSE,
        credit: ctx.pocketOf(row.depositor) ?? BANK,
        counterparty: row.depositor,
        memo: 'Internal funding into Expense'
      })
    )
  }

  // Partial draws must be booked in chronological order so the running total —
  // and thus the remaining-balance memo — is correct across native + token
  // withdrawals of the same budget.
  const payouts = [
    ...(input.transfers ?? []).map((row) => ({ row, token: null as string | null })),
    ...(input.tokenTransfers ?? []).map((row) => ({ row, token: row.token }))
  ].sort((a, b) => a.row.timestamp - b.row.timestamp || a.row.id.localeCompare(b.row.id))
  for (const { row, token } of payouts) {
    entries.push(mapTransfer(row, token, ctx, tracker))
  }

  for (const row of input.ownerTreasuryWithdrawNatives ?? []) {
    entries.push(
      internalMove(row, null, ctx, {
        debit: BANK,
        credit: EXPENSE,
        counterparty: row.ownerAddress,
        memo: 'Owner sweep Expense → Bank'
      })
    )
  }

  for (const row of input.ownerTreasuryWithdrawTokens ?? []) {
    entries.push(
      internalMove(row, row.token, ctx, {
        debit: BANK,
        credit: EXPENSE,
        counterparty: row.ownerAddress,
        memo: 'Owner sweep Expense → Bank'
      })
    )
  }

  return entries
}

/**
 * Fallback recognition of expense spend from the **portal** budget balance, used
 * when the on-chain payout events are unavailable (the indexer is down or not
 * synced for the team, so `mapExpenseAccountEvents` yields no UC-EXP-01 payout).
 *
 * The portal's `ExpenseResponse` carries the amount already drawn against each
 * approved budget (`balances[1]`, whole-token units, read from the contract), so
 * even with no indexed `Transfer` we can book the spend cash-basis —
 * Dr Operating Expense · Cr Cash — Expense — for the drawn total, with the memo
 * stating the budget's remaining balance. This gives one posting per budget (the
 * per-withdrawal granularity only the on-chain events carry is unavailable here).
 *
 * The entry is timestamped at the record's last update (when it was last drawn),
 * falling back to its creation. It is booked `enriched` (its `Operating` category
 * is known from the budget itself), so the enrichment join leaves it untouched.
 */
export function mapExpenseDrawsFromPortal(
  expenses: readonly ExpenseResponse[] | undefined,
  ctx: MapperContext
): LedgerEntry[] {
  const entries: LedgerEntry[] = []
  for (const expense of expenses ?? []) {
    const data = expense.data
    if (!data) continue
    const tokenId = ctx.tokenIdOf(data.tokenAddress)
    const decimals = getTokenDecimals(tokenId)
    const drawnBase = toBaseUnits(Number(expense.balances?.[1] ?? 0), decimals)
    if (drawnBase === null || drawnBase <= 0n) continue
    const member = String(data.approvedAddress ?? expense.userAddress ?? '').toLowerCase()
    if (!member) continue
    const timestamp = toSeconds(expense.updatedAt) || toSeconds(expense.createdAt)
    const capBase = toBaseUnits(Number(data.amount), decimals) ?? 0n
    entries.push(
      makeEntry({
        id: `expense-drawn-${expense.id}`,
        timestamp,
        useCase: 'UC-EXP-01',
        debit: 'Operating Expense',
        credit: EXPENSE,
        amountUsd: ctx.toUsd(drawnBase, tokenId, atDate(timestamp)),
        token: tokenId,
        rawAmount: drawnBase.toString(),
        counterparty: member,
        category: 'Operating',
        enrichment: 'enriched',
        memo: `Expense drawn — expense #${expense.id}${remainingMemo(capBase - drawnBase, tokenId)}`
      })
    )
  }
  return entries
}
