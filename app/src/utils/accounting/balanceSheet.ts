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
import { formatUnits } from 'viem'
import { ACCOUNT_NAMES, classOf, type AccountName } from './chartOfAccounts'
import { netBalanceByAccount, netBalanceByAccountRaw } from './generalLedger'
import { buildIncomeStatement } from './incomeStatement'
import type { LedgerEntry } from './ledgerEntry'
import type { StatementLine } from './incomeStatement'
import type { TokenId } from '@/constant'
import { getTokenDecimals } from '@/utils/constantUtil'

/** The five on-chain cash pockets that roll up into the single Cash line. */
const CASH_ACCOUNTS: ReadonlySet<AccountName> = new Set<AccountName>([
  'Cash — Bank',
  'Cash — Safe',
  'Cash — Payroll',
  'Cash — Expense',
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
  /** Net USD value of the holding (0 for unpriced native — see {@link CashCurrencyLine.tokenAmount}). */
  amountUsd: number
  /** Net quantity in whole tokens (POL/USDC/…), so unpriced native is still visible. */
  tokenAmount: number
  /**
   * Whether a USD rate of record resolved for this holding — always true for
   * stablecoins (pegged), and true for native (POL/ETH) once its price-of-record
   * lands. Distinguishes a **priced dust** holding (worth a few cents, so its
   * {@link CashCurrencyLine.amountUsd} rounds to $0.00 but is still shown as
   * `≈ $0.00`) from a genuinely **unpriced** native holding (no rate yet, shown
   * as its token quantity alone). See {@link ../presenter.cashCurrencyValue}.
   */
  priced: boolean
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
  /** Liability accounts with non-zero balance (Wage Payable, Shares to be issued). */
  liabilities: StatementLine[]
  totalLiabilities: number
  ownerCapital: number
  investorEquity: number
  /** Period net income closed into equity. */
  retainedEarnings: number
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
 * subtract into `equityAndResult`. Summed from the raw net balances so the
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
  for (const [account, value] of netBalanceByAccountRaw(entries)) {
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
 * raw token amount, so a pocket's holding is tracked per token — the native
 * quantity stays visible even while native has no USD price-of-record (its USD
 * value reads 0). Fully-settled (net-zero) holdings are dropped.
 */
function buildCashByPocketCurrency(entries: readonly LedgerEntry[]): CashCurrencyLine[] {
  const acc = new Map<
    string,
    { account: AccountName; token: TokenId; usd: number; raw: bigint; priced: boolean }
  >()
  const bump = (account: AccountName, token: TokenId, usd: number, raw: bigint): void => {
    const key = `${account}|${token}`
    const cur = acc.get(key) ?? { account, token, usd: 0, raw: 0n, priced: false }
    cur.usd += usd
    cur.raw += raw
    // A non-zero USD leg means its rate of record resolved (stablecoins always;
    // native once priced). Accumulated with OR so a holding whose legs net to
    // dust — value rounds to $0.00 — is still flagged priced, not unpriced.
    cur.priced = cur.priced || usd !== 0
    acc.set(key, cur)
  }
  for (const entry of entries) {
    const raw = toBigInt(entry.rawAmount)
    if (entry.debit && CASH_ACCOUNTS.has(entry.debit))
      bump(entry.debit, entry.token, entry.amountUsd, raw)
    if (entry.credit && CASH_ACCOUNTS.has(entry.credit))
      bump(entry.credit, entry.token, -entry.amountUsd, -raw)
  }

  // Emit pocket-by-pocket (chart order), currency-by-currency (display order),
  // dropping holdings that net to nothing in both USD and token terms.
  const lines: CashCurrencyLine[] = []
  for (const account of ACCOUNT_NAMES) {
    if (!CASH_ACCOUNTS.has(account)) continue
    for (const token of CURRENCY_ORDER) {
      const cur = acc.get(`${account}|${token}`)
      if (!cur) continue
      const tokenAmount = Number(formatUnits(cur.raw, getTokenDecimals(token)))
      const amountUsd = round2(cur.usd)
      if (amountUsd === 0 && Math.abs(tokenAmount) < 1e-9) continue
      lines.push({ account, token, amountUsd, tokenAmount, priced: cur.priced })
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
    totalEquity,
    totalLiabilitiesAndEquity,
    identityGap,
    balanced: Math.abs(identityGap) < CENT
  }
}
