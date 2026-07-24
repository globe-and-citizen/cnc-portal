import { formatUnits, maxUint256, parseUnits } from 'viem'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import type { ZodSafeParseResult } from 'zod'

dayjs.extend(utc)
import type {
  CreditCallForm,
  CreditLender,
  CreditOfferForm,
  CreditRound,
  CreditWhitelistAllocationSummary,
  CreditWhitelistEntry,
  FixedReturnOfferLender,
  FixedReturnOfferParams,
  FixedReturnRawOffer,
  LendingOfferStruct,
  RoundStatus,
  StatusMeta
} from '@/types'
import {
  getCreditTokenSymbol,
  isLendingOfferAcceptingFunds,
  sumWhitelistAmount,
  toFixedReturnOfferParams
} from './communityCreditOfferUtil'
import { shortenAddress } from './generalUtil'

/** Clears `errors`, then repopulates it from a failed `safeParse` result (first issue
 *  per field wins). Returns whether the parse succeeded — the shared shape behind every
 *  hand-rolled step-validator in the Community Credit wizard (Basics/Terms/Access all
 *  otherwise re-implemented this same "clear, loop issues, assign by field" dance). */
export function applyZodFieldErrors(
  result: ZodSafeParseResult<unknown>,
  errors: Record<string, string>
): boolean {
  Object.keys(errors).forEach((key) => delete errors[key])
  if (result.success) return true
  for (const issue of result.error.issues) {
    const field = String(issue.path[0])
    if (!errors[field]) errors[field] = issue.message
  }
  return false
}

/** Format an amount with a token suffix, e.g. `23,400 USDC`. No decimals by default —
 *  pass `maximumFractionDigits` for amounts that can be fractional (e.g. a live on-chain
 *  remaining/cap figure), so a value like 0.5 doesn't silently round up to "1". */
export function formatAmount(n: number, token = 'USDC', maximumFractionDigits = 0): string {
  return `${formatNumber(n, maximumFractionDigits)} ${token}`
}

/** Format a number with thousands separators, no decimals by default. */
export function formatNumber(n: number, maximumFractionDigits = 0): string {
  return Number(n).toLocaleString('en-US', { maximumFractionDigits })
}

/** Rounds to 4 decimal places — enough to kill floating-point noise (e.g. 0.1 + 0.2)
 *  without collapsing genuinely small fractional amounts (e.g. 0.2) down to 0, which
 *  `Math.round` did for any round/offer with a sub-1 remaining or cap. */
export function roundToDisplayPrecision(n: number): number {
  return Math.round(n * 10000) / 10000
}

/** Repayable ceiling for a round: the tighter of what's still owed and what the treasury
 *  currently holds (a `null` balance — not yet loaded — imposes no extra cap). */
export function repayableCeiling(outstanding: number, treasuryBalance: number | null): number {
  return roundToDisplayPrecision(Math.min(outstanding, treasuryBalance ?? outstanding))
}

/** Two-letter initials from a member name, ignoring a trailing `(you)`. */
export function creditInitials(name: string): string {
  const parts = name.replace(' (you)', '').trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const second = parts[1]?.[0] ?? ''
  return (first + second).toUpperCase()
}

/** Inline style for a member avatar built from its two-color gradient. */
export function avatarStyle(gradient: string): Record<string, string> {
  return { background: `linear-gradient(135deg, ${gradient})` }
}

/** Total interest owed on a round at its fixed rate. */
export function roundInterest(round: Pick<CreditRound, 'raised' | 'rate'>): number {
  return (round.raised * round.rate) / 100
}

/** Total due at maturity (principal + interest). */
export function roundTotalDue(round: Pick<CreditRound, 'raised' | 'rate'>): number {
  return round.raised + roundInterest(round)
}

/** True once a round actually raised at least its full funding target — false for a
 *  round that reached Funded/Repaying via acceptPartialFunding with less than target
 *  raised. Callers past the open/stalled stage shouldn't assume "no longer raising"
 *  means "fully funded" — the two aren't the same since that feature shipped. */
export function reachedFundingTarget(round: Pick<CreditRound, 'raised' | 'target'>): boolean {
  return round.raised >= round.target
}

/** Display label + badge color for every round status. */
export const ROUND_STATUS_META: Record<RoundStatus, StatusMeta> = {
  open: { label: 'Open', color: 'primary' },
  stalled: { label: 'Action needed', color: 'warning' },
  funded: { label: 'Funded', color: 'info' },
  active: { label: 'In repayment', color: 'warning' },
  overdue: { label: 'Overdue', color: 'error' },
  repaid: { label: 'Repaid', color: 'success' },
  refunded: { label: 'Refunded', color: 'neutral' }
}

export function statusMeta(status: RoundStatus): StatusMeta {
  return ROUND_STATUS_META[status]
}

// Form control styling (shared by the create wizard) now lives in
// communityCreditWizardUtil.ts alongside the rest of the wizard-only helpers.

/** `period`'s canonical unit — whole minutes, matching the deadline's own
 *  minute-precision clock field. */
export const MINUTES_PER_DAY = 1_440

/** Humanizes a whole-minute term length to the coarsest unit that keeps it a whole
 *  number — minutes under an hour, hours under a day, days otherwise. Almost every
 *  round is day-scale or longer, so this reads naturally without ever showing an
 *  ugly fraction (e.g. "0.03 days" for a 45-minute term). */
export function formatCreditPeriod(minutes: number): string {
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`
  if (minutes < MINUTES_PER_DAY) {
    const hours = Math.round(minutes / 60)
    return `${hours} hour${hours === 1 ? '' : 's'}`
  }
  const days = Math.round(minutes / MINUTES_PER_DAY)
  return `${days} day${days === 1 ? '' : 's'}`
}

const CALENDAR_BREAKDOWN_UNITS: {
  unit: 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute'
  label: string
}[] = [
  { unit: 'year', label: 'year' },
  { unit: 'month', label: 'month' },
  { unit: 'week', label: 'week' },
  { unit: 'day', label: 'day' },
  { unit: 'hour', label: 'hour' },
  { unit: 'minute', label: 'minute' }
]

/** Core cursor-walk: consumes `end`'s distance from `start` one calendar unit at a
 *  time (years, then months, then weeks, then days), so e.g. 90 months from a given
 *  start reads as `7 years, 6 months` rather than a flat day count. Shared by every
 *  breakdown entry point below — the wizard's own preview, the terms schema's
 *  over-cap error, and every on-chain round card — so they can never disagree. */
function calendarBreakdownBetween(start: dayjs.Dayjs, end: dayjs.Dayjs): string {
  let cursor = start
  const parts: string[] = []
  for (const { unit, label } of CALENDAR_BREAKDOWN_UNITS) {
    const amount = end.diff(cursor, unit)
    if (amount > 0) {
      parts.push(`${amount} ${label}${amount === 1 ? '' : 's'}`)
      cursor = cursor.add(amount, unit)
    }
  }
  return parts.join(', ')
}

/**
 * Breaks a term length down into a calendar-exact `7 years, 6 months` style string,
 * anchored on the real subscription deadline — e.g. 90 months is shown as its actual
 * calendar equivalent, not the flat day count the contract stores. Falls back to
 * `formatCreditPeriod` once no deadline is set yet (nothing to anchor the breakdown
 * on) or the breakdown comes back empty (a span under one day). Exported standalone
 * so the terms schema's over-the-cap error message can render the exact same
 * breakdown as the summary card, rather than a bare number the issuer would have to
 * mentally convert.
 */
export function formatCalendarBreakdown(
  deadline: string,
  deadlineTime: string,
  periodMinutes: number
): string {
  if (!deadline) return formatCreditPeriod(periodMinutes)
  const cursor = dayjs.utc(`${deadline}T${deadlineTime || '00:00'}:00Z`)
  const maturity = cursor.add(periodMinutes, 'minute')
  return calendarBreakdownBetween(cursor, maturity) || formatCreditPeriod(periodMinutes)
}

/**
 * Same calendar breakdown as `formatCalendarBreakdown`, but for an already-created
 * on-chain round — computed directly from its `subscriptionDeadline`/`maturityDate`
 * instants rather than a wizard form's deadline + relative period, so every round card
 * shows the same "what does this term actually mean" treatment as a custom wizard
 * entry, not a bare, possibly four-or-five-digit day count.
 */
export function formatRoundTerm(
  subscriptionDeadline: bigint,
  maturityDate: bigint,
  periodMinutes: number
): string {
  const start = dayjs.utc(Number(subscriptionDeadline) * 1000)
  const maturity = dayjs.utc(Number(maturityDate) * 1000)
  return calendarBreakdownBetween(start, maturity) || formatCreditPeriod(periodMinutes)
}

/**
 * Friendly term label. A preset chip shows its own literal day count (`90 days`) —
 * that's exactly what the button said. Any custom term, regardless of which unit
 * built it, shows the real calendar breakdown instead (`8000 days` reads as `21
 * years, 10 months, 3 weeks, 4 days`) — composing your own term deserves seeing what
 * it actually means, not a raw number in whichever unit you happened to type it in.
 * Shared by the wizard's own preview and the sticky summary card so they can't drift
 * apart.
 */
export function creditTermLabel(
  form: Pick<CreditCallForm, 'period' | 'periodMode' | 'deadline' | 'deadlineTime'>
): string {
  if (form.periodMode !== 'custom' || !form.deadline) return formatCreditPeriod(form.period)
  return formatCalendarBreakdown(form.deadline, form.deadlineTime, form.period)
}

// ───────── on-chain → CreditRound adapters ─────────

/** Avatar gradient palette — lenders have no on-chain color, so derive one by address. */
const CREDIT_GRADIENT_STOPS = ['#00bf7a', '#00b8d9', '#3366ff', '#0f3d2e', '#00925c']

/** Deterministic two-color gradient for an address (stable across renders). */
export function gradientForAddress(address: string): string {
  let hash = 0
  for (let i = 0; i < address.length; i++) hash = (hash * 31 + address.charCodeAt(i)) >>> 0
  const first = CREDIT_GRADIENT_STOPS[hash % CREDIT_GRADIENT_STOPS.length]
  const second = CREDIT_GRADIENT_STOPS[(hash >> 4) % CREDIT_GRADIENT_STOPS.length]
  const distinct =
    first === second ? CREDIT_GRADIENT_STOPS[(hash + 1) % CREDIT_GRADIENT_STOPS.length] : second
  return `${first},${distinct}`
}

/** Full principal + flat interest the issuer owes across the whole funded amount. */
function offerExpectedTotal(offer: LendingOfferStruct): bigint {
  return offer.totalFunded + (offer.totalFunded * offer.interestRateBps) / 10_000n
}

/** True once `now` has passed an offer's maturity date (subscriptionDeadline + term) —
 *  the contract itself never checks this (repayLenders has no on-chain maturity guard), so
 *  it's purely a display signal, same spirit as isLendingOfferAcceptingFunds for the
 *  subscription deadline. */
function isOfferPastMaturity(offer: LendingOfferStruct, now: Date): boolean {
  return now.getTime() >= offerMaturityDate(offer).getTime()
}

/**
 * Resolves FixedReturn.sol's OfferState (+ deadline and repayment progress) to a
 * Community Credit round status: Open→open (or stalled, once its deadline has passed
 * without reaching target — awaiting the issuer's refundLenders/acceptPartialFunding
 * decision), Funded→funded, Refundable→refunded (refundLenders already pushed every
 * lender's principal back by the time this state is observable — there's no
 * intermediate "refund pending" state to distinguish), Repaying→active until the
 * issuer has repaid the full principal+interest, then repaid. Funded and Repaying both
 * additionally resolve to overdue once past maturity with the debt not yet fully
 * repaid — purely a badge, since nothing on-chain enforces or blocks on maturity; the
 * issuer can still repay (or a lender still gets refunded via the stalled path, which
 * is unrelated and only applies pre-Funded) exactly as before.
 */
export function offerStateToRoundStatus(
  offer: LendingOfferStruct,
  now: Date = new Date()
): RoundStatus {
  switch (offer.state) {
    case 1:
      return isOfferPastMaturity(offer, now) ? 'overdue' : 'funded'
    case 2:
      return 'refunded'
    case 3:
      if (offer.totalRepaidByIssuer >= offerExpectedTotal(offer)) return 'repaid'
      return isOfferPastMaturity(offer, now) ? 'overdue' : 'active'
    default:
      return isLendingOfferAcceptingFunds(offer, now) ? 'open' : 'stalled'
  }
}

/** Short human date+time for an on-chain unix-seconds timestamp, or `—` when unset.
 *  Includes the clock time (not just the day) since subscriptionDeadline is minute-
 *  precision on-chain — two rounds closing hours apart on the same calendar day must
 *  render distinguishably. Formatted in UTC, not the browser's local zone: the wizard
 *  builds this same timestamp from `deadline`+`deadlineTime` by treating the typed
 *  clock time as UTC (see toUnixSeconds), so rendering it back in local time would
 *  silently shift it by the viewer's UTC offset — a round set for "11:01 UTC" showing
 *  up as "18:01" with no indication why. 12-hour with AM/PM to match
 *  CreditCallSummaryCard's deadline row and the native time input's own rendering —
 *  our own formatting, not left to the browser's locale, so it's guaranteed consistent
 *  for every viewer regardless of OS/browser. */
function formatOfferDate(unixSeconds: bigint): string {
  const secs = Number(unixSeconds)
  return secs > 0 ? dayjs.utc(secs * 1000).format('MMM D, h:mm A [UTC]') : '—'
}

/** Absolute maturity of an offer, for sorting/comparison. */
export function offerMaturityDate(offer: LendingOfferStruct): Date {
  return new Date(Number(offer.maturityDate) * 1000)
}

/**
 * Maps one on-chain offer (from useFixedReturnAllOffers) to the CreditRound the
 * Community Credit UI renders. Amounts are scaled by the offer's token decimals; the
 * title/purpose come from the off-chain metadata endpoint (FixedReturn.sol stores
 * neither), falling back to generic copy. `lenders` is left empty — the per-round lender
 * list is a separate on-chain read (useFixedReturnOfferLenders) that the round detail
 * view fetches on demand, so the list doesn't pay for it.
 */
export function lendingOfferToCreditRound(
  raw: FixedReturnRawOffer,
  title?: string,
  purpose?: string,
  now: Date = new Date()
): CreditRound {
  const { offerId, offer, decimals } = raw
  const status = offerStateToRoundStatus(offer, now)
  const maturity = dayjs.utc(offerMaturityDate(offer)).format('MMM D')
  const period = Math.round((Number(offer.maturityDate) - Number(offer.subscriptionDeadline)) / 60)

  return {
    id: String(offerId),
    name: title || `Round #${offerId}`,
    token: getCreditTokenSymbol(offer.token),
    target: Number(formatUnits(offer.fundingTarget, decimals)),
    raised: Number(formatUnits(offer.totalFunded, decimals)),
    totalRepaid: Number(formatUnits(offer.totalRepaidByIssuer, decimals)),
    rate: Number(offer.interestRateBps) / 100,
    period,
    termLabel: formatRoundTerm(offer.subscriptionDeadline, offer.maturityDate, period),
    status,
    // Only a genuinely still-fundable round (status 'open', not 'stalled') belongs in
    // the "Open & active rounds" card grid — same instant used for `status` above, so
    // the two can never disagree at the deadline boundary.
    fundable: isLendingOfferAcceptingFunds(offer, now),
    opened: formatOfferDate(offer.subscriptionDeadline),
    deadline: formatOfferDate(offer.subscriptionDeadline),
    maturity,
    repaidOn: status === 'repaid' ? maturity : undefined,
    restricted: offer.fundingAccess === 1,
    cap: offer.isCapEnabled ? Number(formatUnits(offer.lenderCap, decimals)) : null,
    desc: purpose || 'On-chain fixed-return credit round.',
    lenders: []
  }
}

/**
 * Maps one on-chain lender position (from useFixedReturnOfferLenders) to a CreditLender.
 * Name resolution is injected to keep this pure; the avatar gradient is derived from
 * the address, and there is no per-deposit timestamp on-chain so `date` is blank.
 * `paid` is a proportional estimate — this lender's share of raised × the round's
 * totalRepaid — rather than an extra per-lender read of the on-chain totalPaidToLender
 * mapping. `refunded` checks that refundLenders zeroes this lender's on-chain
 * principal, so `principal === 0` in an otherwise-refunded round means they were paid
 * back, not that they never lent.
 */
export function offerLenderToCreditLender(
  lender: FixedReturnOfferLender,
  resolveName: (address: string) => string,
  connectedAddress?: string,
  round?: Pick<CreditRound, 'raised' | 'totalRepaid'> & { status?: RoundStatus }
): CreditLender {
  const paid = round && round.raised > 0 ? (round.totalRepaid * lender.principal) / round.raised : 0
  return {
    name: resolveName(lender.address),
    addr: shortenAddress(lender.address),
    gradient: gradientForAddress(lender.address),
    amount: lender.principal,
    expected: lender.expected,
    paid,
    date: '',
    you: !!connectedAddress && lender.address.toLowerCase() === connectedAddress.toLowerCase(),
    refunded: lender.principal === 0 && round?.status === 'refunded'
  }
}

// ───────── whitelist / uncapped allocation (Community Credit only) ─────────
// FixedReturn.sol's UNCAPPED_ALLOCATION sentinel has no representation in the
// generic FixedReturnWhitelistEntry/toFixedReturnOfferParams shapes above, so this
// concept lives entirely in Community Credit's own files.

/** Mirrors FixedReturn.sol's UNCAPPED_ALLOCATION — a whitelisted lender with no
 *  personal ceiling beyond the round's remaining funding target. */
export const UNCAPPED_ALLOCATION = maxUint256

/** True when a whitelist entry has no personal amount — either because the round has
 *  no cap at all (every entry sits unset), or, with a cap on, the schema no longer
 *  allows this (every entry must have an amount); kept as a named check since
 *  toCreditCallOfferParams still needs to recognize an unset entry either way. */
export function isCreditWhitelistEntryUncapped(w: CreditWhitelistEntry): boolean {
  return w.amount == null
}

/**
 * Sum of whitelist amounts in the token's smallest-unit terms — each amount is
 * independently scaled via parseUnits, then summed as integers, exactly mirroring how
 * FixedReturn.sol computes allocatedTotal on-chain. Comparing this bigint sum (rather
 * than the raw float total) against a similarly-scaled target is what keeps the
 * frontend's "must add up to exactly the target" check from ever accepting a whitelist
 * that would then revert on-chain with a one-unit rounding mismatch.
 */
export function sumWhitelistAmountUnits(
  whitelist: { amount: number | null }[],
  decimals: number
): bigint {
  return whitelist.reduce(
    (sum, w) => sum + (w.amount == null ? 0n : parseUnits(String(w.amount), decimals)),
    0n
  )
}

/**
 * Builds the on-chain create-offer params for a Community Credit round: delegates to
 * toFixedReturnOfferParams for everything else, then patches each uncapped entry's
 * allocation to UNCAPPED_ALLOCATION — a plain `number` amount can't represent that
 * sentinel through the normal parseUnits path.
 */
export function toCreditCallOfferParams(
  form: CreditOfferForm,
  whitelist: CreditWhitelistEntry[]
): FixedReturnOfferParams {
  const params = toFixedReturnOfferParams(form, whitelist)
  return {
    ...params,
    allocations: params.allocations.map((allocation, i) => {
      const entry = whitelist[i]
      return entry && isCreditWhitelistEntryUncapped(entry) ? UNCAPPED_ALLOCATION : allocation
    })
  }
}

/**
 * Reachability rule FixedReturn.sol enforces on-chain when a whitelist is fully capped:
 * allocations must sum to at least the target ('under' otherwise, which blocks
 * publishing). Summing to more ('over') is fine and expected — a deliberate buffer
 * against a whitelisted lender who ends up not depositing their full allocation; it
 * doesn't let actual deposits over-raise, since lendFunds caps the running total at
 * the target regardless. Only meaningful when capOn is true — callers should not
 * display this for a round with no cap, since every entry sits unset (amount-less) in
 * that mode and the summary would be noise.
 */
export function getCreditWhitelistAllocationSummary(
  whitelist: CreditWhitelistEntry[],
  principalTarget: number,
  token?: string
): CreditWhitelistAllocationSummary {
  const committedTotal = sumWhitelistAmount(whitelist)
  const status =
    committedTotal > principalTarget
      ? 'over'
      : whitelist.length > 0 && committedTotal < principalTarget
        ? 'under'
        : 'exact'
  const tokenLabel = token ?? ''
  const prefix = `Allocated ${committedTotal.toLocaleString('en-US')} / ${Math.round(principalTarget).toLocaleString('en-US')} ${tokenLabel}`

  if (status === 'over') {
    const excess = (committedTotal - principalTarget).toLocaleString('en-US')
    return {
      committedTotal,
      status,
      description: `${prefix} — ${excess} ${tokenLabel} buffer over target`
    }
  }
  if (status === 'under') {
    const shortfall = (principalTarget - committedTotal).toLocaleString('en-US')
    return { committedTotal, status, description: `${prefix} — ${shortfall} ${tokenLabel} short` }
  }
  return { committedTotal, status, description: prefix }
}
