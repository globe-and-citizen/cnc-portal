/**
 * The Accounting summary view projected directly from the canonical journal.
 *
 * Split from {@link ./presenter} (which turns the statements into their line
 * views) the way {@link ./ledgerCategory} was split from the ledger presenter, so
 * each module stays focused. Pure and unit-testable; the presenter re-exports
 * everything here, so callers can keep importing from it.
 */
import { formatUsd } from '@/utils/format'
import { buildAccountingSummary } from './accountingSummary'
import { buildBalanceSheet } from './balanceSheet'
import { buildGeneralLedger } from './generalLedger'
import { buildIncomeStatement } from './incomeStatement'
import { ZERO_USD_AMOUNT, usdAmountToNumber } from './monetaryAmount'
import type {
  AccountingSummary,
  BalanceSheet,
  GeneralLedger,
  IncomeStatement,
  JournalEntry,
  UsdAmount
} from './types'

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

export interface SummaryBanner {
  balanced: boolean
  identity: string
  trial: string
}

export interface SummaryView {
  cards: SummaryCard[]
  banner: SummaryBanner
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

function outstandingDebt(balance: BalanceSheet): UsdAmount {
  return balance.liabilities
    .filter((line) => DEBT_ACCOUNTS.has(line.account.family.name))
    .reduce((sum, line) => sum + line.balance, ZERO_USD_AMOUNT)
}

function displayUsd(amount: UsdAmount): string {
  return formatUsd(usdAmountToNumber(amount))
}

/** The summary metric cards from the live roll-up + statements. */
function summaryCards(
  summary: AccountingSummary,
  income: IncomeStatement,
  balance: BalanceSheet
): SummaryCard[] {
  const profitable = income.netIncome >= ZERO_USD_AMOUNT
  return [
    {
      label: 'Net income',
      value: displayUsd(income.netIncome),
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
      displayUsd(income.totalRevenue),
      'Service + trading gain',
      'i-heroicons-arrow-trending-up',
      'bg-success/10 text-success'
    ),
    metric(
      'Total expenses',
      displayUsd(income.totalExpenses),
      'Payroll · ops · trading · dividend',
      'i-heroicons-arrow-trending-down',
      'bg-warning/10 text-warning'
    ),
    metric(
      'Total transaction fees',
      displayUsd(summary.transactionFees),
      'Bank protocol fee skimmed on transfers',
      'i-heroicons-receipt-percent',
      'bg-warning/10 text-warning'
    ),
    metric(
      'Total assets',
      displayUsd(balance.totalAssets),
      'Asset account balances',
      'i-heroicons-wallet',
      'bg-info/10 text-info'
    ),
    metric(
      'Total equity',
      displayUsd(balance.totalEquity),
      'Equity accounts + earnings to date',
      'i-heroicons-user-group',
      'bg-primary/10 text-primary'
    ),
    metric(
      'Outstanding debt',
      displayUsd(outstandingDebt(balance)),
      'Principal + fixed return owed to lenders',
      'i-heroicons-banknotes',
      CREDIT_CHIP
    ),
    // The counterpart card, shown only once the team has actually paid a lender
    // back: on a book that never repaid anything it would read $0.00 forever and
    // say nothing.
    ...(summary.debtRepaid > ZERO_USD_AMOUNT
      ? [
          metric(
            'Debt repaid',
            displayUsd(summary.debtRepaid),
            'Principal + fixed return returned to lenders',
            'i-heroicons-arrow-uturn-left',
            CREDIT_CHIP
          )
        ]
      : [])
  ]
}

/** The balance checks displayed beside the Summary metrics. */
function summaryBanner(balance: BalanceSheet, ledger: GeneralLedger): SummaryBanner {
  return {
    balanced: balance.balanced && ledger.balanced,
    identity: `${displayUsd(balance.totalAssets)} = ${displayUsd(balance.totalLiabilities)} + ${displayUsd(balance.totalEquity)}`,
    trial: `Trial balance Dr ${displayUsd(ledger.debitBalanceTotal)} = Cr ${displayUsd(ledger.creditBalanceTotal)}`
  }
}

/** Build the complete Summary display model from one canonical journal input. */
export function presentSummary(entries: readonly JournalEntry[]): SummaryView {
  const summary = buildAccountingSummary(entries)
  const income = buildIncomeStatement(entries)
  const balance = buildBalanceSheet(entries)
  const ledger = buildGeneralLedger(entries)

  return {
    cards: summaryCards(summary, income, balance),
    banner: summaryBanner(balance, ledger)
  }
}
