/**
 * Source-mapper barrel + orchestrator.
 *
 * {@link buildCncLedgerEntries} runs every source mapper over the raw indexed
 * events, concatenates the resulting ledger entries, sorts them chronologically,
 * and runs the off-chain enrichment join. The result is the normalized general
 * ledger the trial-balance / income-statement / balance-sheet layer rolls up.
 */
import { enrichEntries, type EnrichmentSources } from '@/utils/accounting/enrichment'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'
import { mapBankEvents, type BankMapperInput } from './bank'
import { mapFees, type FeeMapperInput } from './fees'
import { mapCashRemunerationEvents, type CashRemunerationMapperInput } from './cashRemuneration'
import { mapExpenseAccountEvents, type ExpenseMapperInput } from './expenseAccount'
import { mapInvestorEvents, type InvestorMapperInput } from './investor'
import { mapSafeTransfers, type SafeMapperInput } from './safe'
import { mapSafeDepositRouterEvents, type SafeDepositRouterMapperInput } from './safeDepositRouter'
import { mapPayrollAccruals } from './payrollAccrual'
import { mapExpenseDrawsFromPortal } from './expenseAccount'
import type { MapperContext } from './context'

export * from './context'
export * from './payrollAccrual'
export * from './bank'
export * from './fees'
export * from './cashRemuneration'
export * from './expenseAccount'
export * from './investor'
export * from './safe'
export * from './safeDepositRouter'

/** Every raw-event source the mappers consume, grouped by contract. */
export interface LedgerSources {
  bank?: BankMapperInput
  fees?: FeeMapperInput
  cashRemuneration?: CashRemunerationMapperInput
  expenseAccount?: ExpenseMapperInput
  investor?: InvestorMapperInput
  safe?: SafeMapperInput
  safeDepositRouter?: SafeDepositRouterMapperInput
}

/**
 * Run every mapper and return the unsorted, un-enriched ledger entries. The
 * portal `expenses` (off-chain) supply each budget's cap so a partial expense
 * payout can report its remaining balance.
 */
export function mapAllSources(
  sources: LedgerSources,
  ctx: MapperContext,
  offChain: EnrichmentSources = {}
): LedgerEntry[] {
  const entries: LedgerEntry[] = []
  if (sources.bank) entries.push(...mapBankEvents(sources.bank, ctx))
  if (sources.fees) entries.push(...mapFees(sources.fees, ctx))
  if (sources.cashRemuneration) {
    entries.push(...mapCashRemunerationEvents(sources.cashRemuneration, ctx))
  }
  if (sources.expenseAccount) {
    entries.push(...mapExpenseAccountEvents(sources.expenseAccount, ctx, offChain.expenses))
  }
  if (sources.investor) entries.push(...mapInvestorEvents(sources.investor, ctx))
  if (sources.safe) entries.push(...mapSafeTransfers(sources.safe, ctx))
  if (sources.safeDepositRouter) {
    entries.push(...mapSafeDepositRouterEvents(sources.safeDepositRouter, ctx))
  }
  return entries
}

/**
 * Build the CNC general ledger end to end: map every on-chain source, add the
 * off-chain payroll accruals (UC-CASH-02, booked at claim submission), sort by
 * time, then enrich payroll/expense entries with their off-chain category.
 *
 * Expenses stay cash-basis (booked at each on-chain payout). When the indexer
 * returned **no** expense payout at all — its events aren't synced for the team —
 * the drawn amount is instead recognised from the portal budget balance
 * (`mapExpenseDrawsFromPortal`) so the books still reflect the spend. The two are
 * mutually exclusive, so the fallback never double-counts an indexed payout.
 */
export function buildCncLedgerEntries(
  sources: LedgerSources,
  ctx: MapperContext,
  offChain: EnrichmentSources = {}
): LedgerEntry[] {
  const onChain = mapAllSources(sources, ctx, offChain)
  const hasIndexedExpensePayout = onChain.some((e) => e.useCase === 'UC-EXP-01')
  const mapped = [
    ...onChain,
    ...mapPayrollAccruals(offChain.weeklyClaims, ctx),
    ...(hasIndexedExpensePayout ? [] : mapExpenseDrawsFromPortal(offChain.expenses, ctx))
  ].sort((a, b) => a.timestamp - b.timestamp)
  return enrichEntries(mapped, offChain, ctx.tokenIdOf)
}
