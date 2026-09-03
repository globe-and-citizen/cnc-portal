/**
 * Balance sheet (issue #2117, catalogue §6.6).
 *
 * Assets = Liabilities + Equity, as of the end of the period. Built from the
 * consolidated feed plus the period's net income, which closes into
 * **Retained Earnings**:
 *
 *  - Assets       cash pockets (rolled up) + Trading account + any other asset
 *  - Liabilities  Wage Payable + Loan Payable
 *  - Equity       Owner Capital + Investor Equity + SHERS To Be Issued
 *                 − Deferred SHER Compensation (contra-equity)
 *                 + Retained Earnings (net income)
 *
 * The identity holds by construction: every posting is balanced and net income
 * is exactly Σincome − Σexpense, so contributed-equity + retained-earnings +
 * liabilities = the asset side. In the worked example: assets 142.20 = equity
 * 142.20 (Investor Equity 138 + Retained Earnings 14.20), liabilities 0.
 */
import { formatUnits } from 'viem'
import { ACCOUNT_NAMES, classOf, type AccountName } from './chartOfAccounts'
import { netBalanceByAccount, netBalanceByAccountUnrounded } from './generalLedger'
import { buildIncomeStatement } from './incomeStatement'
import type { LedgerEntry } from './ledgerEntry'
import type { StatementLine } from './incomeStatement'
import type { TokenId } from '@/constant'
import { getTokenDecimals } from '@/utils/tokens/metadata'

/** The on-chain cash pockets that roll up into the single Cash line. */
const CASH_ACCOUNTS: ReadonlySet<AccountName> = new Set<AccountName>([
  'Cash — Bank',
  'Cash — Safe',
  'Cash — Payroll',
  'Cash — Expense',
  'Cash — Credit',
  'Cash — FeeCollector'
])

/** Display order of cash currencies within a pocket. */
const CURRENCY_ORDER: readonly TokenId[] = ['native', 'usdc', 'usdc.e', 'usdt', 'sher']

/** One (pocket × currency) cash holding — the breakdown of `Cash (all pockets)`. */
export interface CashCurrencyLine {
  /** The cash pocket (`Cash — Bank`, `Cash — Safe`, …). */
  account: AccountName
  /** The token held in that pocket. */
  token: TokenId
  /** Net USD value of the holding. */
  amountUsd: number
  /** Net quantity in whole tokens (POL/USDC/…) — what a native holding is shown in. */
  tokenAmount: number
}

export interface BalanceSheet {
  /** Total cash across every pocket (the single "Cash" asset line). */
  cash: number
  /** Per-pocket cash breakdown, for drill-down. */
  cashByPocket: StatementLine[]
  /** Per-pocket **and per-currency** cash breakdown (Bank×POL, Bank×USDC, …). */
  cashByPocketCurrency: CashCurrencyLine[]
  /** Non-cash assets (Trading account, …) with non-zero balance. */
  otherAssets: StatementLine[]
  totalAssets: number
  /** Liability accounts with non-zero balance (Wage Payable, …). */
  liabilities: StatementLine[]
  totalLiabilities: number
  ownerCapital: number
  investorEquity: number
  /** Period net income closed into equity. */
  retainedEarnings: number
  /** Contra-equity and pending-equity lines with non-zero balance. */
  contraEquity: StatementLine[]
  totalEquity: number
  /**
   * Liabilities + Equity as a single figure, summed at full precision and
   * rounded once — exactly equal to {@link totalAssets} for a balanced book. Use
   * this (not `totalLiabilities + totalEquity`) for the balance-check display so
   * the two grand totals foot to the cent.
   */
  totalLiabilitiesAndEquity: number
  /** totalAssets − (totalLiabilities + totalEquity); ~0 means it balances. */
  identityGap: number
  /** True when |identityGap| ≤ one cent. */
  balanced: boolean
}

const CENT = 0.01

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * The full-precision (unrounded) side totals of the balance-sheet identity.
 * Net income closes into equity, so income accounts add and expense accounts
 * subtract into `equityAndResult`. CONTRA_EQUITY is debit-normal and reduces
 * equity, so it is subtracted. Summed from the raw net balances so the
 * grand totals are rounded exactly **once** — summing already-rounded
 * per-account balances (multi-currency values rounded before summation) drifts a
 * cent and would break `Assets = Liabilities + Equity`.
 */
function rawSideTotals(entries: readonly LedgerEntry[]): {
  assets: number
  cash: number
  liabilities: number
  equityAndResult: number
} {
  let assets = 0
  let cash = 0
  let liabilities = 0
  let equityAndResult = 0
  for (const [account, value] of netBalanceByAccountUnrounded(entries)) {
    switch (classOf(account)) {
      case 'ASSET':
        assets += value
        if (CASH_ACCOUNTS.has(account)) cash += value
        break
      case 'LIABILITY':
        liabilities += value
        break
      case 'EQUITY':
      case 'INCOME':
        equityAndResult += value
        break
      case 'CONTRA_EQUITY':
        equityAndResult -= value
        break
      case 'EXPENSE':
        equityAndResult -= value
        break
    }
  }
  return { assets, cash, liabilities, equityAndResult }
}

/** Parse a stringified base-unit amount to bigint, tolerating a bad value. */
function toBigInt(raw: string): bigint {
  try {
    return BigInt(raw)
  } catch {
    return 0n
  }
}

/**
 * Break the cash pockets down by **pocket and currency** (Bank×POL, Bank×USDC,
 * Safe×USDC, …). Each cash leg contributes its signed USD value *and* its signed
 * raw token amount, so a holding is tracked in both — a native pocket is reported
 * in POL as well as dollars. Fully-settled (net-zero) holdings are dropped.
 */
function buildCashByPocketCurrency(entries: readonly LedgerEntry[]): CashCurrencyLine[] {
  const holdings = new Map<
    string,
    { account: AccountName; token: TokenId; usd: number; raw: bigint }
  >()
  const addHolding = (account: AccountName, token: TokenId, usd: number, raw: bigint): void => {
    const key = `${account}|${token}`
    const holding = holdings.get(key) ?? { account, token, usd: 0, raw: 0n }
    holding.usd += usd
    holding.raw += raw
    holdings.set(key, holding)
  }
  for (const entry of entries) {
    const raw = toBigInt(entry.rawAmount)
    if (entry.debit && CASH_ACCOUNTS.has(entry.debit))
      addHolding(entry.debit, entry.token, entry.amountUsd, raw)
    if (entry.credit && CASH_ACCOUNTS.has(entry.credit))
      addHolding(entry.credit, entry.token, -entry.amountUsd, -raw)
  }

  // Emit pocket-by-pocket (chart order), currency-by-currency (display order),
  // dropping holdings that net to nothing in both USD and token terms.
  const lines: CashCurrencyLine[] = []
  for (const account of ACCOUNT_NAMES) {
    if (!CASH_ACCOUNTS.has(account)) continue
    for (const token of CURRENCY_ORDER) {
      const holding = holdings.get(`${account}|${token}`)
      if (!holding) continue
      const tokenAmount = Number(formatUnits(holding.raw, getTokenDecimals(token)))
      const amountUsd = round2(holding.usd)
      if (amountUsd === 0 && Math.abs(tokenAmount) < 1e-9) continue
      lines.push({ account, token, amountUsd, tokenAmount })
    }
  }
  return lines
}

/** Build the balance sheet as of the end of the supplied feed. */
export function buildBalanceSheet(entries: readonly LedgerEntry[]): BalanceSheet {
  const net = netBalanceByAccount(entries)
  const balanceOf = (account: AccountName): number => net.get(account) ?? 0

  const cashByPocket: StatementLine[] = []
  const otherAssets: StatementLine[] = []
  const liabilities: StatementLine[] = []
  const contraEquity: StatementLine[] = []

  // Line items display the per-account cent-rounded balances (each clean on its
  // own); the grand totals below come from the raw sums, never from these.
  for (const account of ACCOUNT_NAMES) {
    const amount = balanceOf(account)
    if (CASH_ACCOUNTS.has(account)) {
      if (amount !== 0) cashByPocket.push({ account, amount })
      continue
    }
    const cls = classOf(account)
    if (cls === 'ASSET' && amount !== 0) otherAssets.push({ account, amount })
    else if (cls === 'LIABILITY' && amount !== 0) liabilities.push({ account, amount })
    else if (cls === 'CONTRA_EQUITY' && amount !== 0) contraEquity.push({ account, amount })
  }

  const ownerCapital = balanceOf('Owner Capital')
  const investorEquity = balanceOf('Investor Equity')
  const retainedEarnings = buildIncomeStatement(entries).netIncome

  // Grand totals: sum at full precision, round exactly once. The identity is
  // checked on the raw gap for the same reason — per-account cent rounding
  // (most visibly SHER's non-terminating values) would falsely flag a balanced
  // book "out of balance".
  const raw = rawSideTotals(entries)
  const cash = round2(raw.cash)
  const totalAssets = round2(raw.assets)
  const totalLiabilities = round2(raw.liabilities)
  // Liabilities + Equity as one rounded figure — equal to Total assets by the
  // double-entry identity (both are the same raw sum). Equity is then the
  // balancing residual, so the two grand totals foot to the cent on screen and
  // in every export, and re-foot identically on a second export.
  const totalLiabilitiesAndEquity = round2(raw.liabilities + raw.equityAndResult)
  const totalEquity = round2(totalLiabilitiesAndEquity - totalLiabilities)

  const identityGap = round2(raw.assets - (raw.liabilities + raw.equityAndResult))

  return {
    cash,
    cashByPocket,
    cashByPocketCurrency: buildCashByPocketCurrency(entries),
    otherAssets,
    totalAssets,
    liabilities,
    totalLiabilities,
    ownerCapital,
    investorEquity,
    retainedEarnings,
    contraEquity,
    totalEquity,
    totalLiabilitiesAndEquity,
    identityGap,
    balanced: Math.abs(identityGap) < CENT
  }
}
