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

// ───────── form control styling (shared by the create wizard) ─────────

/** Base classes for the plain text/number/date inputs used in the wizard. */
export const CREDIT_FIELD_CLASS =
  'w-full h-[38px] rounded-lg border border-default bg-default px-3 text-sm outline-none focus:border-primary focus:ring-3 focus:ring-primary/20'

/** Selectable pill (token / term length) — highlighted when active. */
export function creditChipClass(active: boolean) {
  return [
    'flex-1 rounded-lg border px-3.5 py-2 text-center text-xs font-semibold transition-colors cursor-pointer',
    active ? 'border-primary bg-primary/10 text-primary' : 'border-default bg-default text-muted'
  ]
}

/** Large radio-style access option row. */
export function creditAccessRowClass(active: boolean) {
  return [
    'flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-colors',
    active ? 'border-primary bg-primary/5' : 'border-default bg-default'
  ]
}

/** Radio bullet outline. */
export function creditRadioClass(active: boolean) {
  return [
    'inline-flex h-5 w-5 flex-none items-center justify-center rounded-full border-2',
    active ? 'border-primary' : 'border-default'
  ]
}

/** Friendly term label, e.g. `180 days (from 6 months)` for a non-day custom term.
 *  Leads with `form.period` — the whole-day value actually submitted on-chain — rather
 *  than the raw custom entry, since rounding can make them diverge a lot (2000 minutes
 *  rounds down to 1 day, not the ~1.4 days it looks like at a glance). Shared by the
 *  wizard's own preview and the sticky summary card so they can't drift apart. */
export function creditTermLabel(
  form: Pick<CreditCallForm, 'period' | 'periodMode' | 'periodVal' | 'periodUnit'>
): string {
  const days = `${form.period} day${form.period === 1 ? '' : 's'}`
  if (form.periodMode === 'custom' && form.periodUnit !== 'days' && Number(form.periodVal)) {
    const n = Number(form.periodVal)
    const unit = n === 1 ? form.periodUnit.slice(0, -1) : form.periodUnit
    return `${days} (from ${n} ${unit})`
  }
  return days
}

// ───────── on-chain → CreditRound adapters ─────────

/** Days per FixedReturn.sol TermUnit (Days, Months, Years). */
const TERM_UNIT_DAYS: Record<0 | 1 | 2, number> = { 0: 1, 1: 30, 2: 365 }

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

/** True once `now` has passed an offer's maturity date (startDate + term) — the
 *  contract itself never checks this (repayLenders has no on-chain maturity guard), so
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

/** Absolute maturity (startDate + term) of an offer, for sorting/comparison. */
export function offerMaturityDate(offer: LendingOfferStruct): Date {
  return dayjs(Number(offer.startDate) * 1000)
    .add(offer.termDuration * TERM_UNIT_DAYS[offer.termUnit], 'day')
    .toDate()
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

  return {
    id: String(offerId),
    name: title || `Round #${offerId}`,
    token: getCreditTokenSymbol(offer.token),
    target: Number(formatUnits(offer.fundingTarget, decimals)),
    raised: Number(formatUnits(offer.totalFunded, decimals)),
    totalRepaid: Number(formatUnits(offer.totalRepaidByIssuer, decimals)),
    rate: Number(offer.interestRateBps) / 100,
    period: offer.termDuration * TERM_UNIT_DAYS[offer.termUnit],
    status,
    // Only a genuinely still-fundable round (status 'open', not 'stalled') belongs in
    // the "Open & active rounds" card grid — same instant used for `status` above, so
    // the two can never disagree at the deadline boundary.
    fundable: isLendingOfferAcceptingFunds(offer, now),
    opened: formatOfferDate(offer.startDate),
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
