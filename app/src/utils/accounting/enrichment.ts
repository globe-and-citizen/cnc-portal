/**
 * Off-chain enrichment — the join that gives on-chain entries their *category*.
 *
 * The chain records *when* money moved; the portal records *what it was for*
 * (spec §3.2). This step joins the payroll and expense entries the mappers flag
 * as `needs-off-chain-data` to their portal records:
 *
 * - **Payroll** entries (UC-CASH-03) → the member's `WeeklyClaim` / `Claim` /
 *   `Wage`, attaching the `Payroll` category plus the rate, minutes and claim memo.
 * - **Expense** entries (UC-EXP-01) → the member's `Expense` budget record,
 *   attaching the `Operating` category.
 *
 * An entry with no matching portal record keeps its `needs-off-chain-data` flag so
 * the UI can surface the gap; a matched entry flips to `enriched`. Entries the
 * mappers never flagged (deposits, internal moves, dividends, …) are untouched.
 */
import { getAddress, isAddress, type Address } from 'viem'
import type { TokenId } from '@/constant'
import type { Wage, WeeklyClaim } from '@/types/cash-remuneration'
import type { ExpenseResponse } from '@/types/expense-account'
import type { LedgerEntry } from './ledgerEntry'

export interface EnrichmentSources {
  weeklyClaims?: readonly WeeklyClaim[]
  expenses?: readonly ExpenseResponse[]
}

function normalize(address: Address | string | null | undefined): string | null {
  if (!address || !isAddress(address)) return null
  return getAddress(address).toLowerCase()
}

/** Index portal records by the member address they belong to. */
function indexByAddress<T>(
  rows: readonly T[] | undefined,
  addressOf: (row: T) => string
): Map<string, T[]> {
  const index = new Map<string, T[]>()
  for (const row of rows ?? []) {
    const key = normalize(addressOf(row))
    if (!key) continue
    const list = index.get(key) ?? []
    list.push(row)
    index.set(key, list)
  }
  return index
}

/** Pick the record whose date is closest to the entry's timestamp. */
function nearest<T>(
  rows: T[] | undefined,
  entrySeconds: number,
  dateOf: (row: T) => number
): T | undefined {
  if (!rows?.length) return undefined
  const target = entrySeconds * 1000
  return rows.reduce((best, row) =>
    Math.abs(dateOf(row) - target) < Math.abs(dateOf(best) - target) ? row : best
  )
}

/** Human label for a wage rate, e.g. "12 usdc/h". */
function rateLabel(wage: Wage | undefined): string | null {
  const rate = wage?.ratePerHour?.[0]
  return rate ? `${rate.amount} ${rate.type}/h` : null
}

function enrichPayroll(entry: LedgerEntry, claim: WeeklyClaim | undefined): LedgerEntry {
  if (!claim) return { ...entry, enrichment: 'needs-off-chain-data' }
  const parts = [
    rateLabel(claim.wage),
    `${claim.minutesWorked} min`,
    ...(claim.claims ?? []).map((c) => c.memo).filter(Boolean)
  ].filter(Boolean)
  return {
    ...entry,
    category: 'Payroll',
    minutesWorked: claim.minutesWorked,
    enrichment: 'enriched',
    memo: parts.length ? `${entry.memo} — ${parts.join('; ')}` : entry.memo
  }
}

function enrichExpense(entry: LedgerEntry, expense: ExpenseResponse | undefined): LedgerEntry {
  if (!expense) return { ...entry, enrichment: 'needs-off-chain-data' }
  return {
    ...entry,
    category: 'Operating',
    enrichment: 'enriched',
    memo: `${entry.memo} — expense #${expense.id}`
  }
}

/**
 * Enrich the flagged payroll/expense entries against the portal records. Returns a
 * new array; entries that need no off-chain data pass through unchanged. When a
 * `tokenIdOf` resolver is supplied, expense candidates are narrowed to budgets in
 * the entry's own token before picking the nearest by date — a same-member budget
 * in another token can't be the payout's backing record.
 */
export function enrichEntries(
  entries: readonly LedgerEntry[],
  sources: EnrichmentSources,
  tokenIdOf?: (tokenAddress: string | null | undefined) => TokenId
): LedgerEntry[] {
  const claimsByMember = indexByAddress(sources.weeklyClaims, (c) => c.memberAddress)
  const expensesByUser = indexByAddress(sources.expenses, (e) => e.userAddress)

  return entries.map((entry) => {
    if (entry.enrichment !== 'needs-off-chain-data') return entry
    const member = normalize(entry.counterparty)
    if (!member) return entry

    if (entry.useCase === 'UC-CASH-03') {
      const claim = nearest(claimsByMember.get(member), entry.timestamp, (c) =>
        new Date(c.weekStart).getTime()
      )
      return enrichPayroll(entry, claim)
    }
    if (entry.useCase === 'UC-EXP-01') {
      const candidates = expensesByUser.get(member)
      const sameToken = tokenIdOf
        ? candidates?.filter((e) => tokenIdOf(e.data?.tokenAddress) === entry.token)
        : candidates
      const expense = nearest(sameToken?.length ? sameToken : candidates, entry.timestamp, (e) =>
        new Date(e.createdAt).getTime()
      )
      return enrichExpense(entry, expense)
    }
    return entry
  })
}
