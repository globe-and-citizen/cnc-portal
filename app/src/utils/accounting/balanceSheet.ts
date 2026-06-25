/**
 * Balance sheet (issue #2117, catalogue §6.6).
 *
 * Assets = Liabilities + Equity, as of the end of the period. Built from the
 * consolidated feed plus the period's net income, which closes into
 * **Retained Earnings**:
 *
 *  - Assets       cash pockets (rolled up) + Trading account + any other asset
 *  - Liabilities  Wage Payable + Shares to be issued (net; 0 once settled)
 *  - Equity       Owner Capital + Investor Equity + Retained Earnings (net income)
 *
 * The identity holds by construction: every posting is balanced and net income
 * is exactly Σincome − Σexpense, so contributed-equity + retained-earnings +
 * liabilities = the asset side. In the worked example: assets 142.20 = equity
 * 142.20 (Investor Equity 138 + Retained Earnings 4.20), liabilities 0.
 */
import { ACCOUNT_NAMES, classOf, type AccountName } from './chartOfAccounts'
import { netBalanceByAccount } from './generalLedger'
import { buildIncomeStatement } from './incomeStatement'
import type { LedgerEntry } from './ledgerEntry'
import type { StatementLine } from './incomeStatement'

/** The five on-chain cash pockets that roll up into the single Cash line. */
const CASH_ACCOUNTS: ReadonlySet<AccountName> = new Set<AccountName>([
  'Cash — Bank',
  'Cash — Safe',
  'Cash — Payroll',
  'Cash — Expense',
  'Cash — FeeCollector'
])

export interface BalanceSheet {
  /** Total cash across every pocket (the single "Cash" asset line). */
  cash: number
  /** Per-pocket cash breakdown, for drill-down. */
  cashByPocket: StatementLine[]
  /** Non-cash assets (Trading account, …) with non-zero balance. */
  otherAssets: StatementLine[]
  totalAssets: number
  /** Liability accounts with non-zero balance (Wage Payable, Shares to be issued). */
  liabilities: StatementLine[]
  totalLiabilities: number
  ownerCapital: number
  investorEquity: number
  /** Period net income closed into equity. */
  retainedEarnings: number
  totalEquity: number
  /** totalAssets − (totalLiabilities + totalEquity); ~0 means it balances. */
  identityGap: number
  /** True when |identityGap| ≤ one cent. */
  balanced: boolean
}

const CENT = 0.01

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** Build the balance sheet as of the end of the supplied feed. */
export function buildBalanceSheet(entries: readonly LedgerEntry[]): BalanceSheet {
  const net = netBalanceByAccount(entries)
  const balanceOf = (account: AccountName): number => net.get(account) ?? 0

  let cash = 0
  const cashByPocket: StatementLine[] = []
  const otherAssets: StatementLine[] = []
  const liabilities: StatementLine[] = []

  for (const account of ACCOUNT_NAMES) {
    const amount = balanceOf(account)
    if (CASH_ACCOUNTS.has(account)) {
      cash += amount
      if (amount !== 0) cashByPocket.push({ account, amount })
      continue
    }
    const cls = classOf(account)
    if (cls === 'ASSET' && amount !== 0) otherAssets.push({ account, amount })
    else if (cls === 'LIABILITY' && amount !== 0) liabilities.push({ account, amount })
  }

  cash = round2(cash)
  const totalLiabilities = round2(liabilities.reduce((sum, l) => sum + l.amount, 0))
  const ownerCapital = balanceOf('Owner Capital')
  const investorEquity = balanceOf('Investor Equity')
  const retainedEarnings = buildIncomeStatement(entries).netIncome

  const totalAssets = round2(cash + otherAssets.reduce((sum, a) => sum + a.amount, 0))
  const totalEquity = round2(ownerCapital + investorEquity + retainedEarnings)
  const identityGap = round2(totalAssets - (totalLiabilities + totalEquity))

  return {
    cash,
    cashByPocket,
    otherAssets,
    totalAssets,
    liabilities,
    totalLiabilities,
    ownerCapital,
    investorEquity,
    retainedEarnings,
    totalEquity,
    identityGap,
    balanced: Math.abs(identityGap) < CENT
  }
}
