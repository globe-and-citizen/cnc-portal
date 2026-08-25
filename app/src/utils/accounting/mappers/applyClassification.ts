/**
 * Apply a manual classification on top of an inferred Bank/Safe entry (issue #2457).
 *
 * The Bank and Safe mappers first infer a deposit/withdrawal from its direction and
 * counterparty. This shared helper then overlays the team owner's manual
 * classification, when one exists for the transaction: it re-resolves the balanced
 * debit/credit accounts via the pure {@link resolveClassifiedAccounts} engine and
 * rebuilds the entry, keeping every monetary field (amount, token, rate, txHash,
 * counterparty) intact — only the accounts, the internal flag and the label change.
 *
 * The address inference stays the **visible fallback**: with no classification, or
 * one the engine rejects (an invalid direction/category, or the guaranteed-internal
 * guard), the inferred entry is returned unchanged.
 */
import {
  resolveClassifiedAccounts,
  type ClassificationCategory,
  type ClassificationDirection
} from '@/utils/accounting/classification'
import type { AccountName } from '@/utils/accounting/chartOfAccounts'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'
import type { MapperContext } from './context'

/** The narration shown when the owner classified a transaction but left no note. */
const DEFAULT_MEMO: Record<ClassificationCategory, string> = {
  REVENUE: 'Classified as revenue',
  EXPENSE: 'Classified as an expense',
  OWNER_CAPITAL: 'Classified as owner capital',
  SHAREHOLDER_LOAN: 'Classified as a shareholder loan',
  INTERNAL_TRANSFER: 'Classified as an internal transfer',
  PAYROLL_EXPENSE: 'Classified as a payroll payment',
  INTEREST_EXPENSE: 'Classified as loan interest',
  DIVIDEND_EXPENSE: 'Classified as a dividend'
}

/**
 * Return the inferred entry with the owner's classification applied, or unchanged
 * when there is no applicable classification. `direction` is `'in'` for a deposit
 * and `'out'` for a withdrawal; `cashAccount` is the Bank/Safe pocket the money
 * moved through.
 */
export function applyClassification(
  inferred: LedgerEntry,
  direction: ClassificationDirection,
  cashAccount: AccountName,
  ctx: MapperContext
): LedgerEntry {
  const override = ctx.classificationOf(inferred.id)
  if (!override) return inferred

  const pocket = ctx.pocketOf(inferred.counterparty)
  const accounts = resolveClassifiedAccounts({
    direction,
    cashAccount,
    category: override.category,
    pocket,
    guaranteedInternal: pocket != null
  })
  if (!accounts) return inferred

  const memo = override.memo?.trim() || DEFAULT_MEMO[override.category]
  return {
    ...inferred,
    debit: accounts.debit,
    credit: accounts.credit,
    internal: accounts.internal,
    useCase: accounts.internal ? 'INTERNAL' : direction === 'in' ? 'CASH-IN' : 'CASH-OUT',
    classified: override.category,
    memo,
    // A manual classification is the off-chain review — clear any needs-off-chain-data flag.
    enrichment: 'not-applicable'
  }
}
