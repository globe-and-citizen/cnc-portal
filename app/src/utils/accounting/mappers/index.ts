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
import { mapPayroll, type PayrollMapperInput } from './payroll'
import { mapExpense, type ExpenseMapperInput } from './expenseAccount'
import { mapFixedReturnEvents, type FixedReturnMapperInput } from './fixedReturn'
import { mapInvestorEvents, type InvestorMapperInput } from './investor'
import { mapVestingEvents, type VestingMapperInput } from './vesting'
import { mapSafeTransfers, type SafeMapperInput } from './safe'
import { mapSafeDepositRouterEvents, type SafeDepositRouterMapperInput } from './safeDepositRouter'
import type { MapperContext } from './context'

/** Every raw-event source the mappers consume, grouped by contract. */
export interface LedgerSources {
  bank?: BankMapperInput
  payroll?: PayrollMapperInput
  expense?: ExpenseMapperInput
  fixedReturn?: FixedReturnMapperInput
  investor?: InvestorMapperInput
  vesting?: VestingMapperInput
  safe?: SafeMapperInput
  safeDepositRouter?: SafeDepositRouterMapperInput
}

/**
 * Run every mapper and return the unsorted, un-enriched ledger entries. The
 * portal `expenses` (off-chain) supply each budget's cap so a partial expense
 * payout can report its remaining balance.
 */
function mapAllSources(
  sources: LedgerSources,
  ctx: MapperContext,
  offChain: EnrichmentSources = {}
): LedgerEntry[] {
  const entries: LedgerEntry[] = []
  if (sources.bank) entries.push(...mapBankEvents(sources.bank, ctx))
  entries.push(
    ...mapPayroll(
      {
        ...(sources.payroll ?? {}),
        weeklyClaims: offChain.weeklyClaims ?? sources.payroll?.weeklyClaims
      },
      ctx
    )
  )
  entries.push(...mapExpense(sources.expense ?? {}, ctx, offChain.expenses))
  if (sources.fixedReturn) entries.push(...mapFixedReturnEvents(sources.fixedReturn, ctx))
  if (sources.investor) entries.push(...mapInvestorEvents(sources.investor, ctx))
  if (sources.vesting) entries.push(...mapVestingEvents(sources.vesting, ctx))
  if (sources.safe) entries.push(...mapSafeTransfers(sources.safe, ctx))
  if (sources.safeDepositRouter) {
    entries.push(...mapSafeDepositRouterEvents(sources.safeDepositRouter, ctx))
  }
  return entries
}

/**
 * Build the CNC general ledger end to end: map every domain, sort by time, then
 * enrich Payroll and Expense entries with their off-chain category.
 *
 * Expenses stay cash-basis (booked at each on-chain payout). When the indexer
 * returned **no** expense payout at all — its events aren't synced for the team —
 * the drawn amount is instead recognised from the portal budget balance
 * inside the Expense boundary so the books still reflect the spend. The two are
 * mutually exclusive, so the fallback never double-counts an indexed payout.
 */
export function buildCncLedgerEntries(
  sources: LedgerSources,
  ctx: MapperContext,
  offChain: EnrichmentSources = {}
): LedgerEntry[] {
  const mapped = mapAllSources(sources, ctx, offChain).sort((a, b) => a.timestamp - b.timestamp)
  return enrichEntries(mapped, offChain, ctx.tokenIdOf)
}
