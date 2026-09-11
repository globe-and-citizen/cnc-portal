/**
 * Payroll source mapper — weekly accrual and on-chain settlement (spec §4).
 *
 * - `Withdraw` (native) / `WithdrawToken` (USDC): the cash leg settles the wage
 *   liability — Dr Wage Payable · Cr Cash — Payroll. Flagged `needs-off-chain-data`
 *   so the enrichment step can attach the `Wage`/`Claim` category (rate, minutes,
 *   memo).
 * - `WithdrawToken` where the token is **SHER**: the wage is paid in shares —
 *   Dr SHERS To Be Issued · Cr Investor Equity (the equity leg of UC-CASH-03).
 *   The matching `Investor Minted` is therefore *not* re-booked by the investor
 *   mapper (it would double-count the equity).
 * - `Deposited`: internal funding of the payroll pocket from Bank — internal move.
 * - `OwnerTreasuryWithdraw*` (the `ownerWithdrawAllToBank` sweep): internal move
 *   back to Bank.
 */
import { formatUnits } from 'viem'
import type { TokenId } from '@/constant'
import type { WeeklyClaim } from '@/types/cash-remuneration'
import type {
  CashRemunerationDepositRow,
  CashRemunerationWithdrawRow,
  CashRemunerationWithdrawTokenRow,
  CashRemunerationOwnerTreasuryWithdrawNativeRow,
  CashRemunerationOwnerTreasuryWithdrawTokenRow
} from '@/types/contract-events/cash-remuneration'
import { makeJournalEntryDraft, type JournalEntryDraft } from '@/utils/accounting/journalEntryDraft'
import { buildClaimRatesWithOvertime } from '@/utils/wages/model'
import type { MapperContext } from './context'
import { createInternalPosting } from './internalPosting'

export interface PayrollMapperInput {
  deposits?: readonly CashRemunerationDepositRow[]
  withdraws?: readonly CashRemunerationWithdrawRow[]
  withdrawTokens?: readonly CashRemunerationWithdrawTokenRow[]
  ownerTreasuryWithdrawNatives?: readonly CashRemunerationOwnerTreasuryWithdrawNativeRow[]
  ownerTreasuryWithdrawTokens?: readonly CashRemunerationOwnerTreasuryWithdrawTokenRow[]
  weeklyClaims?: readonly WeeklyClaim[]
}

const PAYROLL = 'Cash — Payroll' as const
const BANK = 'Cash — Bank' as const

/** Cash leg: settle the wage liability from the payroll pocket. */
function cashSettlement(
  row: {
    id: string
    contractAddress: string
    withdrawer: string
    amount: string
    timestamp: number
  },
  token: string | null,
  ctx: MapperContext
): JournalEntryDraft {
  const tokenId = ctx.tokenIdOf(token)
  return makeJournalEntryDraft({
    id: row.id,
    sourceContract: row.contractAddress,
    timestamp: row.timestamp,
    useCase: 'UC-CASH-03',
    debit: 'Wage Payable',
    credit: PAYROLL,
    creditInstance: row.contractAddress,
    token: tokenId,
    rawAmount: row.amount,
    counterparty: row.withdrawer,
    memo: 'Wage withdrawal — cash settlement',
    enrichment: 'needs-off-chain-data'
  })
}

/** Share leg: wage paid in freshly issued SHER. */
function shareSettlement(row: CashRemunerationWithdrawTokenRow): JournalEntryDraft {
  return makeJournalEntryDraft({
    id: row.id,
    sourceContract: row.contractAddress,
    timestamp: row.timestamp,
    useCase: 'UC-CASH-03',
    debit: 'SHERS To Be Issued',
    credit: 'Investor Equity',
    token: 'sher',
    rawAmount: row.amount,
    counterparty: row.withdrawer,
    shares: Number(formatUnits(BigInt(row.amount), 6)),
    memo: 'Wage paid in shares (SHER mint)',
    enrichment: 'needs-off-chain-data'
  })
}

/** A weekly claim spans the seven days from its `weekStart` (UTC ISO Monday). */
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

function isWeekEnded(claim: WeeklyClaim, now: number): boolean {
  const start = new Date(claim.weekStart).getTime()
  return !Number.isFinite(start) || now >= start + WEEK_MS
}

function submissionSeconds(claim: WeeklyClaim): number {
  const ms = new Date(claim.createdAt || claim.weekStart).getTime()
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : 0
}

function weekEndSeconds(claim: WeeklyClaim): number | undefined {
  const start = new Date(claim.weekStart).getTime()
  if (!Number.isFinite(start)) return undefined
  return Math.floor((start + WEEK_MS - 12 * 60 * 60 * 1000) / 1000)
}

/** Map ended weekly claims to their payroll expense or deferred-SHER accrual. */
function mapAccruals(
  weeklyClaims: readonly WeeklyClaim[] | undefined,
  ctx: MapperContext,
  now: number
): JournalEntryDraft[] {
  const entries: JournalEntryDraft[] = []
  for (const claim of weeklyClaims ?? []) {
    if (claim.status === 'disabled' || !isWeekEnded(claim, now) || !claim.wage) continue
    const weekEnd = weekEndSeconds(claim)
    const at = weekEnd ?? submissionSeconds(claim)
    const rates = buildClaimRatesWithOvertime({
      totalMinutesWorked: claim.minutesWorked,
      maximumHoursPerWeek: claim.wage.maximumHoursPerWeek,
      ratePerHour: claim.wage.ratePerHour ?? [],
      overtimeRatePerHour: claim.wage.overtimeRatePerHour
    })
    for (const rate of rates) {
      const tokenId = rate.type as TokenId
      const base = rate.totalAmount
      if (base === 0n) continue
      const isShare = tokenId === 'sher'
      entries.push(
        makeJournalEntryDraft({
          id: `accrual-${claim.id}-${tokenId}`,
          sourceOperationId: `accrual-${claim.id}`,
          timestamp: at,
          useCase: 'UC-CASH-02',
          debit: isShare ? 'Deferred SHER Compensation' : 'Payroll Expense',
          credit: isShare ? 'SHERS To Be Issued' : 'Wage Payable',
          token: tokenId,
          rawAmount: base.toString(),
          counterparty: claim.memberAddress,
          minutesWorked: claim.minutesWorked,
          periodEnd: weekEnd,
          category: 'Payroll',
          enrichment: 'enriched',
          memo: 'Wage earned — weekly claim submitted'
        })
      )
    }
  }
  return entries
}

/** Map the complete Payroll domain: weekly accruals and CashRemuneration events. */
export function mapPayroll(
  input: PayrollMapperInput,
  ctx: MapperContext,
  now: number = Date.now()
): JournalEntryDraft[] {
  const entries: JournalEntryDraft[] = []

  for (const row of input.deposits ?? []) {
    entries.push(
      createInternalPosting(row, null, ctx, {
        debit: PAYROLL,
        debitInstance: row.contractAddress,
        credit: ctx.pocketOf(row.depositor) ?? BANK,
        creditInstance: row.depositor,
        counterparty: row.depositor,
        memo: 'Internal funding into Payroll'
      })
    )
  }

  for (const row of input.withdraws ?? []) {
    if (BigInt(row.amount) === 0n) continue
    entries.push(cashSettlement(row, null, ctx))
  }

  for (const row of input.withdrawTokens ?? []) {
    const tokenId = ctx.tokenIdOf(row.tokenAddress)
    if (BigInt(row.amount) === 0n) continue
    entries.push(
      tokenId === 'sher' ? shareSettlement(row) : cashSettlement(row, row.tokenAddress, ctx)
    )
  }

  for (const row of input.ownerTreasuryWithdrawNatives ?? []) {
    entries.push(
      createInternalPosting(row, null, ctx, {
        debit: BANK,
        credit: PAYROLL,
        creditInstance: row.contractAddress,
        counterparty: row.ownerAddress,
        memo: 'Owner sweep Payroll → Bank'
      })
    )
  }

  for (const row of input.ownerTreasuryWithdrawTokens ?? []) {
    entries.push(
      createInternalPosting(row, row.tokenAddress, ctx, {
        debit: BANK,
        credit: PAYROLL,
        creditInstance: row.contractAddress,
        counterparty: row.ownerAddress,
        memo: 'Owner sweep Payroll → Bank'
      })
    )
  }

  entries.push(...mapAccruals(input.weeklyClaims, ctx, now))
  return entries
}
