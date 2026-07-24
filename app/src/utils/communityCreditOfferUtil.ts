import { formatUnits, parseUnits, type Address } from 'viem'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { SUPPORTED_TOKENS } from '@/constant'
import type {
  CreditLenderOffering,
  CreditOfferForm,
  CreditTermUnit,
  FixedReturnAccessMode,
  FixedReturnOfferParams,
  FixedReturnWhitelistEntry,
  LendingOfferStruct
} from '@/types'
import { tokenSymbol } from './constantUtil'
import { formatAmountWithPrecision } from './currencyUtil'

dayjs.extend(utc)

// ───────── FixedReturn offer/lender mapping (Community Credit's own — FixedReturn.sol
// is Community Credit's contract, and has no application concept beyond it) ─────────

/** UI-only sanity ceiling on a round's term length — FixedReturn.sol itself places no
 *  upper bound on maturityDate, only that it comes after subscriptionDeadline. 30 years
 *  matches the old on-chain bound for TermUnit.Years from before the maturityDate
 *  migration removed per-unit enforcement (FixedReturn__InvalidTermDuration reverted
 *  above 30 for that unit) — the closest thing this codebase has to a deliberate,
 *  previously-agreed answer to "how long should a round be allowed to run." */
export const CREDIT_TERM_MAX_YEARS = 30
export const CREDIT_TERM_MAX_DAYS = CREDIT_TERM_MAX_YEARS * 365

const CREDIT_TERM_UNIT_TO_DAYJS: Record<CreditTermUnit, dayjs.ManipulateType> = {
  minutes: 'minute',
  days: 'day',
  weeks: 'week',
  months: 'month',
  years: 'year'
}

/** Rough days-per-unit, used only to sanity-clamp a custom entry before it reaches
 *  real calendar arithmetic — precision doesn't matter here, only order of magnitude. */
const CREDIT_TERM_UNIT_APPROX_DAYS: Record<CreditTermUnit, number> = {
  minutes: 1 / 1_440,
  days: 1,
  weeks: 7,
  months: 30.44,
  years: 365.25
}

/** A generous ceiling well inside the ECMAScript `Date` range (valid roughly
 *  ±100,000,000 days from the epoch) even after accounting for the anchor deadline's
 *  own offset from the epoch. Any custom entry beyond this is already many orders of
 *  magnitude past FixedReturn's own term cap (`CREDIT_TERM_MAX_DAYS`), so clamping
 *  loses no meaningful information — it only guards against dayjs silently producing
 *  an Invalid Date for a wildly out-of-range entry (e.g. "100000000" days, almost
 *  exactly that boundary), which would otherwise propagate as NaN through every
 *  downstream diff/format call instead of a readable (if enormous) term. */
const SAFE_MAX_TERM_DAYS = 30_000_000

/**
 * Adds a term length (`value` + `unit`) to a UTC deadline instant (date + optional
 * HH:mm clock time, defaulting to midnight), using real calendar arithmetic — e.g.
 * `.add(6, 'month')` lands on the actual calendar date — rather than a flat
 * days-per-unit approximation. Returns the resulting instant as unix seconds.
 * Shared by the wizard's live term preview (CreditCallTermsStep.vue) and the actual
 * on-chain `maturityDate` computed here in `toFixedReturnOfferParams`, so the two can
 * never disagree.
 */
export function addCreditTerm(
  deadline: string,
  deadlineTime: string,
  value: number,
  unit: CreditTermUnit
): number {
  const approxDays = value * CREDIT_TERM_UNIT_APPROX_DAYS[unit]
  const safeValue =
    approxDays > SAFE_MAX_TERM_DAYS
      ? SAFE_MAX_TERM_DAYS / CREDIT_TERM_UNIT_APPROX_DAYS[unit]
      : value
  return dayjs
    .utc(`${deadline}T${deadlineTime || '00:00'}:00Z`)
    .add(safeValue, CREDIT_TERM_UNIT_TO_DAYJS[unit])
    .unix()
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
    maturityDate: BigInt(
      addCreditTerm(form.deadline, form.deadlineTime, form.termValue, form.termUnit)
    ),
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
