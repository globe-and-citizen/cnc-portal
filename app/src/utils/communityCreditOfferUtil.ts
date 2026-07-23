import { formatUnits, parseUnits, type Address } from 'viem'
import { SUPPORTED_TOKENS } from '@/constant'
import type {
  CreditLenderOffering,
  CreditOfferForm,
  FixedReturnAccessMode,
  FixedReturnOfferParams,
  FixedReturnTermUnit,
  FixedReturnWhitelistEntry,
  LendingOfferStruct
} from '@/types'
import { tokenSymbol } from './constantUtil'
import { formatAmountWithPrecision } from './currencyUtil'

// ───────── FixedReturn offer/lender mapping (Community Credit's own — FixedReturn.sol
// is Community Credit's contract, and has no application concept beyond it) ─────────

/** Maximum term FixedReturn accepts, per FixedReturnTermUnit. */
export const FIXED_RETURN_TERM_MAXIMUMS: Record<FixedReturnTermUnit, number> = {
  days: 365,
  months: 120,
  years: 30
}

/**
 * Resolves a token address to its SUPPORTED_TOKENS decimals, or undefined if it
 * isn't in the static list (e.g. a token added via addTokenSupport that isn't one of
 * the usual USDC/USDCe/USDT). Callers fall back to 6 (the only decimals every
 * FixedReturn-supported token uses today) rather than failing outright.
 */
export function decimalsForFixedReturnToken(tokenAddress: Address): number | undefined {
  return SUPPORTED_TOKENS.find((t) => t.address.toLowerCase() === tokenAddress.toLowerCase())
    ?.decimals
}

const TERM_UNIT_INDEX: Record<FixedReturnTermUnit, 0 | 1 | 2> = { days: 0, months: 1, years: 2 }
const TERM_UNIT_LABEL: Record<0 | 1 | 2, FixedReturnTermUnit> = {
  0: 'days',
  1: 'months',
  2: 'years'
}
const FUNDING_ACCESS_INDEX: Record<FixedReturnAccessMode, 0 | 1> = { general: 0, whitelist: 1 }
const FUNDING_ACCESS_LABEL: Record<0 | 1, FixedReturnAccessMode> = {
  0: 'general',
  1: 'whitelist'
}

/** Resolves a token address to its display symbol via SUPPORTED_TOKENS, e.g. `USDC`. */
export function getCreditTokenSymbol(tokenAddress: Address): string {
  return tokenSymbol(tokenAddress) || 'Token'
}

function formatCreditTokenAmount(amount: number, tokenAddress: Address): string {
  return `${formatAmountWithPrecision(amount, 0, 4)} ${getCreditTokenSymbol(tokenAddress)}`
}

export function sumWhitelistAmount(whitelist: { amount: number | null }[]): number {
  return whitelist.reduce((sum, w) => sum + (w.amount ?? 0), 0)
}

export function percentOf(numerator: number, denominator: number): number {
  return denominator ? Math.min(100, Math.round((numerator / denominator) * 100)) : 0
}

/**
 * Resolves a CreditOfferForm token symbol to its SUPPORTED_TOKENS entry.
 * Excludes 'native' unconditionally — FixedReturn.sol is ERC20-only (SafeERC20
 * transfers, no payable receive). The real "is this token actually accepted by this
 * team's contract" gate is the live getSupportedTokens() read driving the wizard's
 * token dropdown, and the contract's own TokenSupportNotFound revert — this is just a
 * display/encoding lookup, not an access-control check.
 */
export function findCreditToken(symbol: string | undefined) {
  return SUPPORTED_TOKENS.find((t) => t.symbol === symbol && t.id !== 'native')
}

/** Every token this team's FixedReturn contract actually accepts, as select options. */
export function getSupportedCreditTokenOptions(addresses: Address[]) {
  return SUPPORTED_TOKENS.filter(
    (token) =>
      token.id !== 'native' &&
      addresses.some((address) => address.toLowerCase() === token.address.toLowerCase())
  ).map((token) => ({ label: token.symbol, value: token.symbol }))
}

/** `timeStr` is UTC clock time (HH:mm) — same convention as the rest of Community
 *  Credit's date handling (e.g. `formatDateUTC`), so a picked deadline means the same
 *  instant everywhere regardless of the issuer's local timezone. */
function toUnixSeconds(dateStr: string, timeStr: string): bigint {
  return BigInt(Math.floor(new Date(`${dateStr}T${timeStr}:00Z`).getTime() / 1000))
}

/**
 * Maps a CreditOfferForm + whitelist state to FixedReturn.sol's CreateOfferParams
 * shape: scales amounts by the token's decimals, converts dates to unix seconds, and
 * maps the form's string unions to the contract's enum indices.
 */
export function toFixedReturnOfferParams(
  form: CreditOfferForm,
  whitelist: FixedReturnWhitelistEntry[]
): FixedReturnOfferParams {
  const token = findCreditToken(form.token)
  if (!token) throw new Error(`Unsupported token: ${form.token}`)

  const isWhitelist = form.access === 'whitelist'

  return {
    token: token.address as Address,
    fundingTarget: parseUnits(String(form.principal), token.decimals),
    interestRateBps: BigInt(Math.round(form.rate * 100)),
    termDuration: form.termValue,
    termUnit: TERM_UNIT_INDEX[form.termUnit],
    // Deadline and start are the same instant — the loan term begins the moment
    // fundraising closes.
    startDate: toUnixSeconds(form.deadline, form.deadlineTime),
    subscriptionDeadline: toUnixSeconds(form.deadline, form.deadlineTime),
    fundingAccess: FUNDING_ACCESS_INDEX[form.access],
    isCapEnabled: form.capOn,
    lenderCap: form.capOn ? parseUnits(String(form.cap), token.decimals) : 0n,
    whitelistAddrs: isWhitelist ? whitelist.map((w) => w.address as Address) : [],
    allocations: isWhitelist
      ? whitelist.map((w) => parseUnits(String(w.amount ?? 0), token.decimals))
      : []
  }
}

const CREDIT_ACCESS_META: Record<
  FixedReturnAccessMode,
  { accessLabel: string; accessBg: string; accessColor: string; accessDot: string }
> = {
  general: {
    accessLabel: 'Open to all',
    accessBg: '#e6f8f1',
    accessColor: '#0a7a52',
    accessDot: '#00bf7a'
  },
  whitelist: {
    accessLabel: 'Whitelist',
    accessBg: '#ebf0ff',
    accessColor: '#2b50c8',
    accessDot: '#3366ff'
  }
}

/**
 * Maps a single on-chain LendingOffer struct, plus the connected lender's personal
 * Whitelist-mode allocation (0n if not whitelisted or the offer is General) and
 * their cumulative deposits so far, into the lender-facing CreditLenderOffering.
 * lendFunds enforces the cumulative total on-chain (Whitelist allocation or
 * General-mode lenderCap), so `allowed`/`remaining` subtract what's already been
 * deposited rather than just checking the original limit.
 */
export function toLenderOffering(
  offerId: number,
  offer: LendingOfferStruct,
  decimals: number,
  whitelistAllocation: bigint,
  myDeposited: bigint,
  title?: string
): CreditLenderOffering {
  const access = FUNDING_ACCESS_LABEL[offer.fundingAccess]
  const isWhitelist = access === 'whitelist'

  const personalLimitUnits = isWhitelist
    ? whitelistAllocation
    : offer.isCapEnabled
      ? offer.lenderCap
      : null
  const personalRemainingUnits =
    personalLimitUnits != null && personalLimitUnits > myDeposited
      ? personalLimitUnits - myDeposited
      : personalLimitUnits == null
        ? null
        : 0n
  const fundingRemainingUnits =
    offer.fundingTarget > offer.totalFunded ? offer.fundingTarget - offer.totalFunded : 0n
  const remainingUnits =
    personalRemainingUnits == null
      ? fundingRemainingUnits
      : personalRemainingUnits < fundingRemainingUnits
        ? personalRemainingUnits
        : fundingRemainingUnits
  const allowed = remainingUnits > 0n

  const cap = personalLimitUnits != null ? Number(formatUnits(personalLimitUnits, decimals)) : null
  const remaining = Number(formatUnits(remainingUnits, decimals))
  const myDepositedAmount = Number(formatUnits(myDeposited, decimals))

  const raised = Number(formatUnits(offer.totalFunded, decimals))
  const target = Number(formatUnits(offer.fundingTarget, decimals))

  const capNoun = isWhitelist ? 'allocation' : 'cap'
  const limitsLabel =
    cap == null ? 'No cap' : `${formatCreditTokenAmount(cap, offer.token)} ${capNoun}`

  return {
    id: String(offerId),
    title: title ?? `Round #${offerId}`,
    rate: Number(offer.interestRateBps) / 100,
    term: offer.termDuration,
    termUnit: TERM_UNIT_LABEL[offer.termUnit],
    access,
    allowed,
    cap,
    remaining,
    myDeposited: myDepositedAmount,
    raised,
    target,
    token: offer.token,
    pct: percentOf(raised, target),
    limitsLabel,
    ...CREDIT_ACCESS_META[access]
  }
}

/** Mirrors the two time/state guards at the start of FixedReturn.lendFunds. */
export function isLendingOfferAcceptingFunds(offer: LendingOfferStruct, now = new Date()): boolean {
  const nowSeconds = BigInt(Math.floor(now.getTime() / 1000))
  return offer.state === 0 && nowSeconds <= offer.subscriptionDeadline
}
