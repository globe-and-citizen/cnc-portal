/**
 * Balance Sheet projected from the same concrete account rows as the Trial Balance.
 *
 * Permanent accounts keep their Trial Balance `AccountId`, label, and normal-side
 * balance. Income and expense accounts remain temporary accounts; their signed
 * contributions form the explicit `Earnings to date` closing line in Equity.
 */
import { buildGeneralLedger } from './generalLedger'
import { journalAccountBalancesUnrounded } from './journalBalances'
import type { Account } from './accountRegistry'
import type { AccountClass } from './chartOfAccounts'
import type { JournalEntry } from './journalEntry'

/** One concrete account shared with the as-of Trial Balance projection. */
export interface BalanceSheetAccountLine {
  account: Account
  accountLabel: string
  /** The account's balance on its normal side, matching the Trial Balance. */
  balance: number
  /** Signed contribution to its Balance Sheet section. */
  contribution: number
}

export interface BalanceSheet {
  assets: BalanceSheetAccountLine[]
  liabilities: BalanceSheetAccountLine[]
  /** Equity and contra-equity accounts; contra-equity contributions are negative. */
  equity: BalanceSheetAccountLine[]
  /** Income and expense accounts explaining the Earnings to date line. */
  earnings: BalanceSheetAccountLine[]
  totalAssets: number
  totalLiabilities: number
  earningsToDate: number
  totalEquity: number
  totalLiabilitiesAndEquity: number
  identityGap: number
  balanced: boolean
}

const CENT = 0.01

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function contributionFor(accountClass: AccountClass, balance: number): number {
  return accountClass === 'CONTRA_EQUITY' || accountClass === 'EXPENSE' ? -balance : balance
}

/** Build the Balance Sheet as of the end of the supplied journal. */
export function buildBalanceSheet(entries: readonly JournalEntry[]): BalanceSheet {
  const trialRows = buildGeneralLedger(entries).trialBalance
  const rawBalances = journalAccountBalancesUnrounded(entries)
  const assets: BalanceSheetAccountLine[] = []
  const liabilities: BalanceSheetAccountLine[] = []
  const equity: BalanceSheetAccountLine[] = []
  const earnings: BalanceSheetAccountLine[] = []

  let rawAssets = 0
  let rawLiabilities = 0
  let rawPermanentEquity = 0
  let rawEarnings = 0

  for (const row of trialRows) {
    const accountClass = row.account.family.accountClass
    const rawBalance = rawBalances.get(row.account.id)?.amount ?? 0
    const rawContribution = contributionFor(accountClass, rawBalance)
    const line: BalanceSheetAccountLine = {
      account: row.account,
      accountLabel: row.accountLabel,
      balance: row.balance,
      contribution: round2(contributionFor(accountClass, row.balance))
    }

    switch (accountClass) {
      case 'ASSET':
        assets.push(line)
        rawAssets += rawContribution
        break
      case 'LIABILITY':
        liabilities.push(line)
        rawLiabilities += rawContribution
        break
      case 'EQUITY':
      case 'CONTRA_EQUITY':
        equity.push(line)
        rawPermanentEquity += rawContribution
        break
      case 'INCOME':
      case 'EXPENSE':
        earnings.push(line)
        rawEarnings += rawContribution
        break
    }
  }

  const totalAssets = round2(rawAssets)
  const totalLiabilities = round2(rawLiabilities)
  const earningsToDate = round2(rawEarnings)
  const totalLiabilitiesAndEquity = round2(rawLiabilities + rawPermanentEquity + rawEarnings)
  const totalEquity = round2(totalLiabilitiesAndEquity - totalLiabilities)
  const identityGap = round2(rawAssets - (rawLiabilities + rawPermanentEquity + rawEarnings))

  return {
    assets,
    liabilities,
    equity,
    earnings,
    totalAssets,
    totalLiabilities,
    earningsToDate,
    totalEquity,
    totalLiabilitiesAndEquity,
    identityGap,
    balanced: Math.abs(identityGap) < CENT
  }
}
