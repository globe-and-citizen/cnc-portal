/**
 * Balance sheet (issue #2117, catalogue §6.6).
 *
 * Assets = Liabilities + Equity, as of the end of the period. Built from the
 * canonical journal plus the period's net income, which closes into
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
import { ACCOUNT_FAMILIES, type AccountName } from './chartOfAccounts'
import { accountFor, type Account } from './accountRegistry'
import { buildIncomeStatement } from './incomeStatement'
import { journalAccountBalances, journalAccountBalancesUnrounded } from './journalBalances'
import type { JournalEntry } from './journalEntry'
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
  /** The concrete cash pocket (`Cash — Bank`, a later Bank deployment, …). */
  account: Account
  /** The token held in that pocket. */
  token: TokenId
  /** Net USD value of the holding. */
  amountUsd: number
  /** Net quantity in whole tokens (POL/USDC/…) — what a native holding is shown in. */
  tokenAmount: number
}

/** One displayed Balance Sheet account and its normal-side balance. */
export interface BalanceSheetAccountLine {
  account: Account
  amount: number
}

export interface BalanceSheet {
  /** Total cash across every pocket (the single "Cash" asset line). */
  cash: number
  /** Per-pocket cash breakdown, for drill-down. */
  cashByPocket: BalanceSheetAccountLine[]
  /** Per-pocket **and per-currency** cash breakdown (Bank×POL, Bank×USDC, …). */
  cashByPocketCurrency: CashCurrencyLine[]
  /** Non-cash assets (Trading account, …) with non-zero balance. */
  otherAssets: BalanceSheetAccountLine[]
  totalAssets: number
  /** Liability accounts with non-zero balance (Wage Payable, …). */
  liabilities: BalanceSheetAccountLine[]
  totalLiabilities: number
  ownerCapital: BalanceSheetAccountLine
  investorEquity: BalanceSheetAccountLine
  /** Period net income closed into equity. */
  retainedEarnings: number
  /** Contra-equity and pending-equity lines with non-zero balance. */
  contraEquity: BalanceSheetAccountLine[]
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
 * equity, so it is subtracted. Summed from unrounded journal-line balances so the
 * grand totals are rounded exactly **once** — summing already-rounded
 * per-account balances (multi-currency values rounded before summation) drifts a
 * cent and would break `Assets = Liabilities + Equity`.
 */
function rawSideTotals(entries: readonly JournalEntry[]): {
  assets: number
  cash: number
  liabilities: number
  equityAndResult: number
} {
  let assets = 0
  let cash = 0
  let liabilities = 0
  let equityAndResult = 0
  for (const line of journalAccountBalancesUnrounded(entries).values()) {
    switch (line.account.family.accountClass) {
      case 'ASSET':
        assets += line.amount
        if (CASH_ACCOUNTS.has(line.account.family.name)) cash += line.amount
        break
      case 'LIABILITY':
        liabilities += line.amount
        break
      case 'EQUITY':
      case 'INCOME':
        equityAndResult += line.amount
        break
      case 'CONTRA_EQUITY':
        equityAndResult -= line.amount
        break
      case 'EXPENSE':
        equityAndResult -= line.amount
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
function buildCashByPocketCurrency(entries: readonly JournalEntry[]): CashCurrencyLine[] {
  const holdings = new Map<
    string,
    { account: Account; token: TokenId; usd: number; raw: bigint; firstSeen: number }
  >()
  const addHolding = (
    account: Account,
    token: TokenId,
    usd: number,
    raw: bigint,
    firstSeen: number
  ): void => {
    const key = `${account.id}|${token}`
    const holding = holdings.get(key) ?? { account, token, usd: 0, raw: 0n, firstSeen }
    holding.usd += usd
    holding.raw += raw
    holdings.set(key, holding)
  }
  entries.forEach((entry, entryIndex) => {
    for (const line of entry.lines) {
      const movement = line.movement
      if (!movement || !CASH_ACCOUNTS.has(line.account.family.name)) continue
      const raw = toBigInt(movement.rawAmount)
      const amount = line.debit ?? line.credit ?? 0
      const signed = line.debit !== undefined ? amount : -amount
      const signedRaw = line.debit !== undefined ? raw : -raw
      addHolding(line.account, movement.token, signed, signedRaw, entryIndex)
    }
  })

  const chartOrder = new Map(ACCOUNT_FAMILIES.map((family, index) => [family.id, index]))
  return [...holdings.values()]
    .map((holding) => ({
      ...holding,
      tokenAmount: Number(formatUnits(holding.raw, getTokenDecimals(holding.token))),
      amountUsd: round2(holding.usd)
    }))
    .filter((holding) => holding.amountUsd !== 0 || Math.abs(holding.tokenAmount) >= 1e-9)
    .sort((a, b) => {
      const familyOrder =
        (chartOrder.get(a.account.family.id) ?? Infinity) -
        (chartOrder.get(b.account.family.id) ?? Infinity)
      if (familyOrder) return familyOrder
      if (a.account.id !== b.account.id)
        return a.firstSeen - b.firstSeen || a.account.id.localeCompare(b.account.id)
      return CURRENCY_ORDER.indexOf(a.token) - CURRENCY_ORDER.indexOf(b.token)
    })
    .map(({ account, token, amountUsd, tokenAmount }) => ({
      account,
      token,
      amountUsd,
      tokenAmount
    }))
}

/** Build the balance sheet as of the end of the supplied journal. */
export function buildBalanceSheet(entries: readonly JournalEntry[]): BalanceSheet {
  const balances = journalAccountBalances(entries)
  const balanceOf = (account: Account): number => balances.get(account.id)?.amount ?? 0

  const cashByPocket: BalanceSheetAccountLine[] = []
  const otherAssets: BalanceSheetAccountLine[] = []
  const liabilities: BalanceSheetAccountLine[] = []
  const contraEquity: BalanceSheetAccountLine[] = []
  const chartOrder = new Map(ACCOUNT_FAMILIES.map((family, index) => [family.id, index]))

  // Line items preserve their concrete Account identity. The grand totals below
  // still come from raw sums, never from these rounded account balances.
  for (const line of [...balances.values()].sort(
    (a, b) =>
      (chartOrder.get(a.account.family.id) ?? Infinity) -
      (chartOrder.get(b.account.family.id) ?? Infinity)
  )) {
    if (line.amount === 0) continue
    const account = line.account
    if (CASH_ACCOUNTS.has(account.family.name)) {
      cashByPocket.push(line)
      continue
    }
    if (account.family.accountClass === 'ASSET') otherAssets.push(line)
    else if (account.family.accountClass === 'LIABILITY') liabilities.push(line)
    else if (account.family.accountClass === 'CONTRA_EQUITY') contraEquity.push(line)
  }

  const ownerCapitalAccount = accountFor('Owner Capital')
  const investorEquityAccount = accountFor('Investor Equity')
  const ownerCapital = { account: ownerCapitalAccount, amount: balanceOf(ownerCapitalAccount) }
  const investorEquity = {
    account: investorEquityAccount,
    amount: balanceOf(investorEquityAccount)
  }
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
