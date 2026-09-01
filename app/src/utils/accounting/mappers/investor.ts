/**
 * Investor source mapper — share mints, dividends (spec §4, UC-INV-01).
 *
 * A bare `Minted` event is ambiguous (catalogue §5.4): it can back a capital
 * raise (SafeDepositRouter `Deposited`), a wage-in-shares (CashRemuneration
 * `WithdrawToken` in SHER), or a direct mint. So we correlate each mint with the
 * deposits/withdraws that *already* booked the equity, and:
 *
 * - **backed** mint (matches a SafeDepositRouter deposit, a SHER wage withdraw, or
 *   a Vesting `TokensReleased`) → emit nothing: the Investor Equity was booked by
 *   UC-SDR-01 / UC-CASH-03 / UC-VEST-02. Re-booking it here would double-count the
 *   equity and clear `SHERS To Be Issued` twice for one issuance — see money-flow
 *   catalogue §5.4 "Default D".
 * - **unbacked** mint → **Default D**: a direct share issuance. The SHER were
 *   accrued into `SHERS To Be Issued` (the wage accrual, UC-CASH-02) and are now
 *   formally issued, so we clear that equity-pending into contributed equity —
 *   Dr SHERS To Be Issued · Cr Investor Equity — valued at the SHER rate of
 *   record. (It no longer emits a value-0 memo, which left `SHERS To Be Issued`
 *   permanently inflated.)
 *
 * `DividendPaid` → UC-INV-01 (Dr Dividend Expense · Cr Cash — Bank). The summary
 * events `Investor DividendDistributed` and `Bank DividendDistributionTriggered`
 * are **not** mapped — they describe the same money as the per-shareholder
 * `DividendPaid` rows and would double-count the dividend.
 */
import { formatUnits } from 'viem'
import type {
  InvestorMintRow,
  InvestorDividendPaidRow,
  SafeDepositRow
} from '@/types/ponder/investor'
import type { CashRemunerationWithdrawTokenRow } from '@/types/ponder/cash-remuneration'
import type { VestingTokensReleasedRow } from '@/types/ponder/vesting'
import { makeEntry, type LedgerEntry } from '@/utils/accounting/ledgerEntry'
import { atDate, type MapperContext } from './context'

export interface InvestorMapperInput {
  mints?: readonly InvestorMintRow[]
  dividendPaids?: readonly InvestorDividendPaidRow[]
  /** SafeDepositRouter deposits, to recognise capital-raise-backed mints. */
  safeDepositRouterDeposits?: readonly SafeDepositRow[]
  /** CashRemuneration `WithdrawToken` rows, to recognise wage-in-shares mints. */
  cashRemunerationWithdrawTokens?: readonly CashRemunerationWithdrawTokenRow[]
  /** Vesting `TokensReleased` rows, to recognise vested-share mints (UC-VEST-02). */
  vestingReleases?: readonly VestingTokensReleasedRow[]
}

/** `${shareholder}|${sherBaseUnits}` — keys a mint to the move that backs it. */
function backingKey(shareholder: string, sherAmount: string): string {
  return `${shareholder.toLowerCase()}|${sherAmount}`
}

/** A consumable multiset of the (shareholder, SHER amount) pairs already booked. */
function buildBackedMints(input: InvestorMapperInput, ctx: MapperContext): Map<string, number> {
  const counts = new Map<string, number>()
  const add = (key: string) => counts.set(key, (counts.get(key) ?? 0) + 1)

  for (const row of input.safeDepositRouterDeposits ?? []) {
    add(backingKey(row.depositor, row.sherAmount))
  }
  for (const row of input.cashRemunerationWithdrawTokens ?? []) {
    if (ctx.tokenIdOf(row.tokenAddress) === 'sher') add(backingKey(row.withdrawer, row.amount))
  }
  for (const row of input.vestingReleases ?? []) {
    add(backingKey(row.member, row.amount))
  }
  return counts
}

/** Map Investor events: backed mints drop out, the rest become memos/dividends. */
export function mapInvestorEvents(input: InvestorMapperInput, ctx: MapperContext): LedgerEntry[] {
  const backed = buildBackedMints(input, ctx)
  const entries: LedgerEntry[] = []

  for (const row of input.mints ?? []) {
    const key = backingKey(row.shareholder, row.amount)
    const remaining = backed.get(key) ?? 0
    if (remaining > 0) {
      backed.set(key, remaining - 1) // backed — equity already booked elsewhere
      continue
    }
    entries.push(
      makeEntry({
        id: row.id,
        timestamp: row.timestamp,
        useCase: 'DEFAULT-D',
        debit: 'SHERS To Be Issued',
        credit: 'Investor Equity',
        amountUsd: ctx.toUsd(BigInt(row.amount), 'sher', atDate(row.timestamp)),
        token: 'sher',
        rawAmount: row.amount,
        counterparty: row.shareholder,
        shares: Number(formatUnits(BigInt(row.amount), 6)),
        memo: 'Direct SHER mint — shares issued to equity'
      })
    )
  }

  for (const row of input.dividendPaids ?? []) {
    const tokenId = ctx.tokenIdOf(row.token)
    entries.push(
      makeEntry({
        id: row.id,
        timestamp: row.timestamp,
        useCase: 'UC-INV-01',
        debit: 'Dividend Expense',
        credit: 'Cash — Bank',
        amountUsd: ctx.toUsd(BigInt(row.amount), tokenId, atDate(row.timestamp)),
        token: tokenId,
        rawAmount: row.amount,
        counterparty: row.shareholder,
        memo: 'Dividend paid to shareholder'
      })
    )
  }

  return entries
}
