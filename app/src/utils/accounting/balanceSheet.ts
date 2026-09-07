/**
 * Balance Sheet projected from the same concrete account rows as the Trial Balance.
 *
 * Permanent accounts keep their Trial Balance `AccountId`, label, and normal-side
 * balance. Income and expense accounts remain temporary accounts; their signed
 * contributions form the explicit `Earnings to date` closing line in Equity.
 */
import { buildGeneralLedger } from './generalLedger'
import { journalAccountBalances } from './journalBalances'
import type { Account } from './accountRegistry'
import type { AccountClass } from './chartOfAccounts'
import type { JournalEntry } from './journalEntry'
import { ZERO_USD_AMOUNT, type UsdAmount } from './monetaryAmount'

/** One concrete account shared with the as-of Trial Balance projection. */
export interface BalanceSheetAccountLine {
  account: Account
  accountLabel: string
  /** The account's balance on its normal side, matching the Trial Balance. */
  balance: UsdAmount
  /** Signed contribution to its Balance Sheet section. */
  contribution: UsdAmount
}

export interface BalanceSheet {
  assets: BalanceSheetAccountLine[]
  liabilities: BalanceSheetAccountLine[]
  /** Equity and contra-equity accounts; contra-equity contributions are negative. */
  equity: BalanceSheetAccountLine[]
  /** Income and expense accounts explaining the Earnings to date line. */
  earnings: BalanceSheetAccountLine[]
  totalAssets: UsdAmount
  totalLiabilities: UsdAmount
  earningsToDate: UsdAmount
  totalEquity: UsdAmount
  totalLiabilitiesAndEquity: UsdAmount
  identityGap: UsdAmount
  balanced: boolean
}

function contributionFor(accountClass: AccountClass, balance: UsdAmount): UsdAmount {
  return accountClass === 'CONTRA_EQUITY' || accountClass === 'EXPENSE' ? -balance : balance
}

/** Build the Balance Sheet as of the end of the supplied journal. */
export function buildBalanceSheet(entries: readonly JournalEntry[]): BalanceSheet {
  const trialRows = buildGeneralLedger(entries).trialBalance
  const balances = journalAccountBalances(entries)
  const assets: BalanceSheetAccountLine[] = []
  const liabilities: BalanceSheetAccountLine[] = []
  const equity: BalanceSheetAccountLine[] = []
  const earnings: BalanceSheetAccountLine[] = []

  let totalAssets = ZERO_USD_AMOUNT
  let totalLiabilities = ZERO_USD_AMOUNT
  let permanentEquity = ZERO_USD_AMOUNT
  let earningsToDate = ZERO_USD_AMOUNT

  for (const row of trialRows) {
    const accountClass = row.account.family.accountClass
    const balance = balances.get(row.account.id)?.amount ?? ZERO_USD_AMOUNT
    const contribution = contributionFor(accountClass, balance)
    const line: BalanceSheetAccountLine = {
      account: row.account,
      accountLabel: row.accountLabel,
      balance: row.balance,
      contribution
    }

    switch (accountClass) {
      case 'ASSET':
        assets.push(line)
        totalAssets += contribution
        break
      case 'LIABILITY':
        liabilities.push(line)
        totalLiabilities += contribution
        break
      case 'EQUITY':
      case 'CONTRA_EQUITY':
        equity.push(line)
        permanentEquity += contribution
        break
      case 'INCOME':
      case 'EXPENSE':
        earnings.push(line)
        earningsToDate += contribution
        break
    }
  }

  const totalEquity = permanentEquity + earningsToDate
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity
  const identityGap = totalAssets - totalLiabilitiesAndEquity

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
    balanced: identityGap === ZERO_USD_AMOUNT
  }
}
