/**
 * The Accounting page's metric cards — the eight figures that head the summary,
 * derived from the live roll-up and the two statements.
 *
 * Split from {@link ./presenter} (which turns the statements into their line
 * views) the way {@link ./ledgerCategory} was split from the ledger presenter, so
 * each module stays focused. Pure and unit-testable; the presenter re-exports
 * everything here, so callers can keep importing from it.
 */
import { formatUsd } from '@/utils/format'
import type { AccountingSummary } from './accountingSummary'
import type { BalanceSheet } from './balanceSheet'
import type { IncomeStatement } from './incomeStatement'

export interface SummaryCard {
  label: string
  value: string
  valueClass: string
  sub: string
  icon: string
  chipClass: string
  accent: boolean
  accentClass?: string
  trend?: string
}

/** The violet the ledger badges give the whole credit lifecycle. */
const CREDIT_CHIP = 'bg-violet-500/10 text-violet-600 dark:text-violet-400'

/** A secondary metric card (highlighted value, no accent border). */
function metric(
  label: string,
  value: string,
  sub: string,
  icon: string,
  chip: string
): SummaryCard {
  return { label, value, sub, icon, chipClass: chip, valueClass: 'text-highlighted', accent: false }
}

/**
 * What the team owes its Community Credit lenders right now: the principal still
 * to be returned plus the fixed return recognised on top of it. Both accounts are
 * cleared as a round is repaid, so the figure is what is genuinely outstanding —
 * not what was ever borrowed.
 */
const DEBT_ACCOUNTS: ReadonlySet<string> = new Set(['Loan Payable', 'Interest Payable'])

function outstandingDebt(balance: BalanceSheet): number {
  return balance.liabilities
    .filter((line) => DEBT_ACCOUNTS.has(line.account))
    .reduce((sum, line) => sum + line.amount, 0)
}

/** The summary metric cards from the live roll-up + statements. */
export function presentSummaryCards(
  summary: AccountingSummary,
  income: IncomeStatement,
  balance: BalanceSheet
): SummaryCard[] {
  const profitable = income.netIncome >= 0
  return [
    {
      label: 'Net income',
      value: formatUsd(income.netIncome),
      valueClass: profitable ? 'text-primary' : 'text-error',
      sub: 'Profit · revenue − expenses',
      icon: 'i-heroicons-sparkles',
      chipClass: profitable ? 'bg-primary/10 text-primary' : 'bg-error/10 text-error',
      accent: true,
      accentClass: profitable ? 'border-t-primary' : 'border-t-error',
      ...(profitable ? { trend: 'Profit' } : {})
    },
    metric(
      'Total revenue',
      formatUsd(income.totalRevenue),
      'Service + trading gain',
      'i-heroicons-arrow-trending-up',
      'bg-success/10 text-success'
    ),
    metric(
      'Total expenses',
      formatUsd(income.totalExpenses),
      'Payroll · ops · trading · dividend',
      'i-heroicons-arrow-trending-down',
      'bg-warning/10 text-warning'
    ),
    metric(
      'Total transaction fees',
      formatUsd(summary.transactionFees),
      'Bank protocol fee skimmed on transfers',
      'i-heroicons-receipt-percent',
      'bg-warning/10 text-warning'
    ),
    metric(
      'Total assets',
      formatUsd(balance.totalAssets),
      'Cash + trading account',
      'i-heroicons-wallet',
      'bg-info/10 text-info'
    ),
    metric(
      'Total equity',
      formatUsd(balance.totalEquity),
      'Investors + retained earnings',
      'i-heroicons-user-group',
      'bg-primary/10 text-primary'
    ),
    metric(
      'Outstanding debt',
      formatUsd(outstandingDebt(balance)),
      'Principal + fixed return owed to lenders',
      'i-heroicons-banknotes',
      CREDIT_CHIP
    ),
    // The counterpart card, shown only once the team has actually paid a lender
    // back: on a book that never repaid anything it would read $0.00 forever and
    // say nothing.
    ...(summary.debtRepaid > 0
      ? [
          metric(
            'Debt repaid',
            formatUsd(summary.debtRepaid),
            'Principal + fixed return returned to lenders',
            'i-heroicons-arrow-uturn-left',
            CREDIT_CHIP
          )
        ]
      : [])
  ]
}
