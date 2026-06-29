import { formatUnits, parseUnits, type Address } from 'viem'
import { SUPPORTED_TOKENS } from '@/constant'
import { tokenSymbol } from './constantUtil'
import { formatAmountWithPrecision } from './currencyUtil'
import type {
  FixedReturnOfferParams,
  LenderOffering,
  LendingOfferStruct,
  OfferingForm,
  OfferingSummary,
  TermUnit,
  WhitelistEntry
} from '@/types'

const TERM_UNIT_INDEX: Record<TermUnit, 0 | 1 | 2> = { days: 0, months: 1, years: 2 }
const TERM_UNIT_LABEL: Record<0 | 1 | 2, TermUnit> = { 0: 'days', 1: 'months', 2: 'years' }
const FUNDING_ACCESS_INDEX: Record<OfferingForm['access'], 0 | 1> = { general: 0, whitelist: 1 }
const FUNDING_ACCESS_LABEL: Record<0 | 1, OfferingForm['access']> = {
  0: 'general',
  1: 'whitelist'
}

export function moneyShort(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US')
}

export function getOfferingTokenSymbol(tokenAddress: Address): string {
  return tokenSymbol(tokenAddress) || 'Token'
}

export function formatOfferingTokenAmount(amount: number, tokenAddress: Address): string {
  return `${formatAmountWithPrecision(amount, 0, 4)} ${getOfferingTokenSymbol(tokenAddress)}`
}

export function sumWhitelistAmount(whitelist: { amount: number | null }[]): number {
  return whitelist.reduce((sum, w) => sum + (w.amount ?? 0), 0)
}

export function formatOfferingDate(str: string): string {
  const d = new Date(str + 'T00:00:00')
  if (isNaN(d.getTime())) return str
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${String(d.getDate()).padStart(2, '0')} ${m[d.getMonth()]} ${d.getFullYear()}`
}

export function addTerm(date: Date, value: number, unit: TermUnit): Date {
  const d = new Date(date)
  if (unit === 'days') d.setDate(d.getDate() + value)
  else if (unit === 'months') d.setMonth(d.getMonth() + value)
  else d.setFullYear(d.getFullYear() + value)
  return d
}

export function termLabel(value: number, unit: TermUnit): string {
  const noun = unit === 'days' ? 'day' : unit === 'months' ? 'month' : 'year'
  return `${value} ${noun}${value === 1 ? '' : 's'}`
}

export function maturityLabel(startDate: string, termValue: number, termUnit: TermUnit): string {
  const start = new Date(startDate + 'T00:00:00')
  if (isNaN(start.getTime())) return '—'
  return formatOfferingDate(addTerm(start, termValue, termUnit).toISOString().slice(0, 10))
}

export function percentOf(numerator: number, denominator: number): number {
  return denominator ? Math.min(100, Math.round((numerator / denominator) * 100)) : 0
}

export function expectedReturn(principal: number, rate: number): number {
  return principal * (1 + rate / 100)
}

/**
 * Resolves an OfferingForm token symbol to its SUPPORTED_TOKENS entry.
 * Excludes 'native' unconditionally — FixedReturn.sol is ERC20-only (SafeERC20
 * transfers, no payable receive). The real "is this token actually accepted by this
 * team's contract" gate is the live getSupportedTokens() read driving the form's token
 * dropdown (see OfferingBasicsStep.vue) and the contract's own TokenSupportNotFound
 * revert — this is just a display/encoding lookup, not an access-control check.
 */
export function findOfferingToken(symbol: string | undefined) {
  return SUPPORTED_TOKENS.find((t) => t.symbol === symbol && t.id !== 'native')
}

function toUnixEndOfDaySeconds(dateStr: string): bigint {
  return BigInt(Math.floor(new Date(`${dateStr}T23:59:59Z`).getTime() / 1000))
}

/**
 * Maps the UI's OfferingForm + whitelist state to FixedReturn.sol's CreateOfferParams
 * shape: scales amounts by the token's decimals, converts dates to unix seconds, and
 * maps the form's string unions to the contract's enum indices.
 */
export function toFixedReturnOfferParams(
  form: OfferingForm,
  whitelist: WhitelistEntry[]
): FixedReturnOfferParams {
  const token = findOfferingToken(form.token)
  if (!token) throw new Error(`Unsupported token: ${form.token}`)

  const isWhitelist = form.access === 'whitelist'

  return {
    token: token.address as Address,
    fundingTarget: parseUnits(String(form.principal), token.decimals),
    interestRateBps: BigInt(Math.round(form.rate * 100)),
    termDuration: form.termValue,
    termUnit: TERM_UNIT_INDEX[form.termUnit],
    // These are date-only fields in the UI. Encoding the end of the selected UTC
    // day keeps the whole displayed date usable and preserves deadline <= startDate
    // when both dates are the same.
    startDate: toUnixEndOfDaySeconds(form.startDate),
    subscriptionDeadline: toUnixEndOfDaySeconds(form.deadline),
    fundingAccess: FUNDING_ACCESS_INDEX[form.access],
    isCapEnabled: form.capOn,
    lenderCap: form.capOn ? parseUnits(String(form.cap), token.decimals) : 0n,
    whitelistAddrs: isWhitelist ? whitelist.map((w) => w.address as Address) : [],
    allocations: isWhitelist
      ? whitelist.map((w) => parseUnits(String(w.amount ?? 0), token.decimals))
      : []
  }
}

/**
 * Resolves a token address to its SUPPORTED_TOKENS decimals, or undefined if it
 * isn't in the static list (e.g. a token added via addTokenSupport that isn't one of
 * the usual USDC/USDCe/USDT). Callers fall back to 6 (the only decimals every
 * FixedReturn-supported token uses today) rather than failing outright.
 */
export function decimalsForOfferingToken(tokenAddress: Address): number | undefined {
  return SUPPORTED_TOKENS.find((t) => t.address.toLowerCase() === tokenAddress.toLowerCase())
    ?.decimals
}

/** FixedReturn.sol's OfferState enum: Open, Funded, Refundable, Repaying. */
function offerStateToStatus(state: 0 | 1 | 2 | 3): OfferingSummary['status'] {
  if (state === 0) return 'open'
  if (state === 2) return 'closed' // Refundable — deadline missed, lenders can claim back
  return 'funded' // Funded or Repaying
}

/**
 * Maps a single on-chain LendingOffer struct to the UI's OfferingSummary, scaling
 * amounts by the offer's token decimals (resolved by the caller, since this function
 * stays pure — see decimalsForOfferingToken). Title comes from the off-chain metadata
 * endpoint (FixedReturn.sol has no title param) — falls back to a generic label when
 * that hasn't loaded yet or was never recorded.
 */
export function fromLendingOfferStruct(
  offerId: number,
  offer: LendingOfferStruct,
  decimals: number,
  title?: string
): OfferingSummary {
  return {
    id: String(offerId),
    title: title ?? `Offering #${offerId}`,
    rate: Number(offer.interestRateBps) / 100,
    term: offer.termDuration,
    termUnit: TERM_UNIT_LABEL[offer.termUnit],
    startDate: new Date(Number(offer.startDate) * 1000).toISOString().slice(0, 10),
    access: FUNDING_ACCESS_LABEL[offer.fundingAccess],
    raised: Number(formatUnits(offer.totalFunded, decimals)),
    target: Number(formatUnits(offer.fundingTarget, decimals)),
    totalRepaid: Number(formatUnits(offer.totalRepaidByIssuer, decimals)),
    status: offerStateToStatus(offer.state),
    token: offer.token
  }
}

export const ACCESS_META: Record<
  OfferingForm['access'],
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
 * their cumulative deposits so far, into the lender-facing LenderOffering.
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
): LenderOffering {
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
    cap == null ? 'No cap' : `${formatOfferingTokenAmount(cap, offer.token)} ${capNoun}`

  return {
    id: String(offerId),
    title: title ?? `Offering #${offerId}`,
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
    ...ACCESS_META[access]
  }
}

/**
 * Label for a LenderOffering's apply button. "Whitelist only" (never allocated at
 * all, cap is 0) is distinct from "Cap reached" (had room, now used up) so a
 * whitelisted lender who's maxed out isn't told they were never eligible.
 */
export function lenderCtaLabel(o: LenderOffering): string {
  if (o.allowed) return 'Apply to lend'
  if (o.raised >= o.target) return 'Offering filled'
  if (o.access === 'whitelist' && o.cap === 0) return 'Whitelist only'
  return 'Cap reached'
}

/** Mirrors the two time/state guards at the start of FixedReturn.lendFunds. */
export function isLendingOfferAcceptingFunds(offer: LendingOfferStruct, now = new Date()): boolean {
  const nowSeconds = BigInt(Math.floor(now.getTime() / 1000))
  return offer.state === 0 && nowSeconds <= offer.subscriptionDeadline
}
