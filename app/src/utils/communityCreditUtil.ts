import { formatUnits } from 'viem'
import dayjs from 'dayjs'
import type {
  CreditLender,
  CreditRound,
  FixedReturnOfferLender,
  FixedReturnRawOffer,
  LendingOfferStruct,
  RoundStatus
} from '@/types'
import { getOfferingTokenSymbol } from './offeringUtil'
import { shortenAddress } from './generalUtil'

/** Format an integer amount with a token suffix, e.g. `23,400 USDC`. */
export function formatAmount(n: number, token = 'USDC'): string {
  return `${formatNumber(n)} ${token}`
}

/** Format a number with thousands separators and no decimals. */
export function formatNumber(n: number): string {
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })
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

/** Nuxt UI badge color names, kept local to avoid importing UI internals. */
export type BadgeColor = 'neutral' | 'primary' | 'info' | 'warning' | 'success'

export interface StatusMeta {
  label: string
  color: BadgeColor
}

/** Display label + badge color for every round status. */
export const ROUND_STATUS_META: Record<RoundStatus, StatusMeta> = {
  open: { label: 'Open', color: 'primary' },
  funded: { label: 'Funded', color: 'info' },
  active: { label: 'In repayment', color: 'warning' },
  repaid: { label: 'Repaid', color: 'success' },
  refundable: { label: 'Refundable', color: 'warning' }
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

/** Checkbox box (whitelist member picker). */
export function creditCheckClass(active: boolean) {
  return [
    'inline-flex h-5 w-5 flex-none items-center justify-center rounded-md text-white',
    active ? 'bg-primary' : 'border border-default bg-default'
  ]
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

/**
 * Resolves FixedReturn.sol's OfferState (+ repayment progress) to a Community Credit
 * round status: Open→open, Funded→funded, Refundable→refundable, Repaying→active until
 * the issuer has repaid the full principal+interest, then repaid.
 */
export function offerStateToRoundStatus(offer: LendingOfferStruct): RoundStatus {
  switch (offer.state) {
    case 1:
      return 'funded'
    case 2:
      return 'refundable'
    case 3:
      return offer.totalRepaidByIssuer >= offerExpectedTotal(offer) ? 'repaid' : 'active'
    default:
      return 'open'
  }
}

/** Short human date for an on-chain unix-seconds timestamp, or `—` when unset. */
function formatOfferDate(unixSeconds: bigint): string {
  const secs = Number(unixSeconds)
  return secs > 0 ? dayjs(secs * 1000).format('MMM D') : '—'
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
  purpose?: string
): CreditRound {
  const { offerId, offer, decimals } = raw
  const status = offerStateToRoundStatus(offer)
  const maturity = dayjs(offerMaturityDate(offer)).format('MMM D')

  return {
    id: String(offerId),
    name: title || `Round #${offerId}`,
    token: getOfferingTokenSymbol(offer.token),
    target: Number(formatUnits(offer.fundingTarget, decimals)),
    raised: Number(formatUnits(offer.totalFunded, decimals)),
    rate: Number(offer.interestRateBps) / 100,
    period: offer.termDuration * TERM_UNIT_DAYS[offer.termUnit],
    status,
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
 * Name resolution is injected (like buildFixedReturnLenderRows' resolveName) to keep this
 * pure; the avatar gradient is derived from the address, and there is no per-deposit
 * timestamp on-chain so `date` is blank.
 */
export function offerLenderToCreditLender(
  lender: FixedReturnOfferLender,
  resolveName: (address: string) => string,
  connectedAddress?: string
): CreditLender {
  return {
    name: resolveName(lender.address),
    addr: shortenAddress(lender.address),
    gradient: gradientForAddress(lender.address),
    amount: lender.principal,
    date: '',
    you: !!connectedAddress && lender.address.toLowerCase() === connectedAddress.toLowerCase()
  }
}
