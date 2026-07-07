/**
 * ExpenseAccount source mapper — operating expense payouts (spec §4, UC-EXP-01).
 *
 * Expenses are **cash basis**: the cost is recognised when the money actually
 * leaves the pocket, not when the budget is approved. Every payout originates
 * from an **Expense Approval** — either **one-time** (a single withdrawal) or
 * **recurring** (Daily / Weekly / Monthly / Custom, a fresh cap each period). A
 * recurring approval can produce many payouts over time, so every on-chain
 * `Transfer` / `TokenTransfer` is booked on its own — Dr Operating Expense ·
 * Cr Cash — Expense — carrying the structured fields the Activity column reads to
 * adapt its narration: a one-time payout reports its approved cap, a recurring
 * one the balance left in *that* withdrawal's period. Those figures are
 * reconstructed here from the approval and the running total of prior draws
 * (never the Expense pocket balance), so historical entries stay accurate.
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
import { periodIndex } from './expensePeriods'

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

/** An approved budget, normalized for per-period remaining-balance tracking. */
interface BudgetCap {
  tokenId: TokenId
  /** Budget cap in base units — the single-withdrawal limit and the per-period cap. */
  capBase: bigint
  /** Approval time (record creation), Unix seconds — used to attribute a draw. */
  approvedAt: number
  /** Period-anchor time, Unix seconds — the budget's `startDate` (recurring windows). */
  startDate: number
  /** Reset behaviour: 0 One-Time, 1 Daily, 2 Weekly, 3 Monthly, 4 Custom. */
  frequencyType: number
  /** Custom period length in seconds, when `frequencyType === 4`. */
  customFrequency: number
  /** Running total drawn against this budget, per period index, in base units. */
  drawnByPeriod: Map<number, bigint>
}

/** Everything the ledger entry needs to narrate a matched expense payout. */
export interface ExpenseDrawInfo {
  frequencyType: number
  tokenId: TokenId
  /** Approved cap in base units. */
  capBase: bigint
  /** Remaining in the withdrawal's period after this draw (base units, ≥ 0). */
  remainingBase: bigint
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

/**
 * Tracks how much of each approved budget is left as its draws are booked. A
 * budget is keyed by `member:tokenId`; when several exist for the same key a draw
 * is attributed to the most recent one approved before it. Draws are accumulated
 * **per period** (mirroring the contract's per-window reset), so a recurring
 * budget's remaining balance is reported for the withdrawal's own period — a
 * daily 1-USDC budget drawn 0.4 then 0.3 the same day reports 0.6 then 0.3 left.
 */
class RemainingBudgetTracker {
  private readonly byMember = new Map<string, BudgetCap[]>()

  constructor(expenses: readonly ExpenseResponse[] | undefined, ctx: MapperContext) {
    for (const expense of expenses ?? []) {
      const data = expense.data
      if (!data) continue
      const member = String(data.approvedAddress ?? expense.userAddress ?? '').toLowerCase()
      if (!member) continue
      const tokenId = ctx.tokenIdOf(data.tokenAddress)
      const capBase = toBaseUnits(Number(data.amount), getTokenDecimals(tokenId))
      if (capBase === null || capBase <= 0n) continue
      const approvedAt = toSeconds(expense.createdAt)
      const list = this.byMember.get(member) ?? []
      list.push({
        tokenId,
        capBase,
        approvedAt,
        startDate: Number(data.startDate) > 0 ? Number(data.startDate) : approvedAt,
        frequencyType: Number(data.frequencyType) || 0,
        customFrequency: Number(data.customFrequency) || 0,
        drawnByPeriod: new Map()
      })
      this.byMember.set(member, list)
    }
    // Newest-first so a draw picks the most recent budget approved before it.
    for (const list of this.byMember.values()) list.sort((a, b) => b.approvedAt - a.approvedAt)
  }

  /**
   * Book `amountBase` against the withdrawer's budget for `tokenId` and return the
   * approval + remaining-in-period info, or `null` when no matching budget is on
   * file (nothing to narrate against).
   */
  draw(
    withdrawer: string,
    tokenId: TokenId,
    timestamp: number,
    amountBase: bigint
  ): ExpenseDrawInfo | null {
    const candidates = this.byMember.get(withdrawer.toLowerCase())
    const budget = candidates?.find((b) => b.tokenId === tokenId && b.approvedAt <= timestamp)
    if (!budget) return null
    const period = periodIndex(budget, timestamp)
    const total = (budget.drawnByPeriod.get(period) ?? 0n) + amountBase
    budget.drawnByPeriod.set(period, total)
    const remainingBase = budget.capBase - total
    return {
      frequencyType: budget.frequencyType,
      tokenId,
      capBase: budget.capBase,
      remainingBase: remainingBase > 0n ? remainingBase : 0n
    }
  }
}

/** The structured approval fields carried on a matched UC-EXP-01 entry. */
type ApprovalFields = Pick<LedgerEntry, 'expenseFrequencyType' | 'expenseApprovedUsd'> &
  Partial<Pick<LedgerEntry, 'expenseRemainingUsd'>>

/** A token amount formatted with its symbol, e.g. `1.5 USDC`. */
function tokenAmount(amountBase: bigint, tokenId: TokenId): string {
  const address = getTokenAddress(tokenId) ?? zeroAddress
  return `${formatUnits(amountBase, getTokenDecimals(tokenId))} ${tokenSymbol(address)}`
}

/**
 * Structured Activity fields + audit memo suffix for a matched expense payout.
 * A one-time approval carries only its approved cap (it is single-use, so no
 * remaining is meaningful); a recurring one also carries the USD remaining in the
 * withdrawal's period, so the ledger can read "$0.70 remaining".
 */
function presentApproval(
  info: ExpenseDrawInfo,
  ctx: MapperContext,
  at: Date
): { fields: ApprovalFields; memo: string } {
  const oneTime = info.frequencyType === 0
  const fields: ApprovalFields = {
    expenseFrequencyType: info.frequencyType,
    expenseApprovedUsd: ctx.toUsd(info.capBase, info.tokenId, at)
  }
  if (oneTime) {
    return { fields, memo: ` — one-time approval of ${tokenAmount(info.capBase, info.tokenId)}` }
  }
  fields.expenseRemainingUsd = ctx.toUsd(info.remainingBase, info.tokenId, at)
  const memo =
    info.remainingBase <= 0n
      ? ' — period budget fully drawn'
      : ` — ${tokenAmount(info.remainingBase, info.tokenId)} left this period`
  return { fields, memo }
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
  const at = atDate(row.timestamp)
  const paidElsewhere = row.to.toLowerCase() !== row.withdrawer.toLowerCase()
  const info = tracker.draw(row.withdrawer, tokenId, row.timestamp, amountBase)
  const approval = info ? presentApproval(info, ctx, at) : null
  const base = paidElsewhere ? `Approved expense payout to ${row.to}` : 'Approved expense payout'
  return makeEntry({
    id: row.id,
    timestamp: row.timestamp,
    useCase: 'UC-EXP-01',
    debit: 'Operating Expense',
    credit: EXPENSE,
    amountUsd: ctx.toUsd(amountBase, tokenId, at),
    token: tokenId,
    rawAmount: row.amount,
    counterparty: row.withdrawer,
    memo: `${base}${approval?.memo ?? ''}`,
    enrichment: 'needs-off-chain-data',
    ...(approval?.fields ?? {})
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
    const at = atDate(timestamp)
    const capBase = toBaseUnits(Number(data.amount), decimals) ?? 0n
    // `balances[1]` is the contract's `totalWithdrawn`, which resets each period
    // for a recurring budget — so `cap − drawn` is the current-period remaining.
    const remainingBase = capBase - drawnBase
    const approval = presentApproval(
      {
        frequencyType: Number(data.frequencyType) || 0,
        tokenId,
        capBase,
        remainingBase: remainingBase > 0n ? remainingBase : 0n
      },
      ctx,
      at
    )
    entries.push(
      makeEntry({
        id: `expense-drawn-${expense.id}`,
        timestamp,
        useCase: 'UC-EXP-01',
        debit: 'Operating Expense',
        credit: EXPENSE,
        amountUsd: ctx.toUsd(drawnBase, tokenId, at),
        token: tokenId,
        rawAmount: drawnBase.toString(),
        counterparty: member,
        category: 'Operating',
        enrichment: 'enriched',
        memo: `Expense drawn — expense #${expense.id}${approval.memo}`,
        ...approval.fields
      })
    )
  }
  return entries
}
