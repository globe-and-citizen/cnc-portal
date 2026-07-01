import type { CreditRound, RoundStatus } from '@/types'

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
  draft: { label: 'Draft', color: 'neutral' },
  open: { label: 'Open', color: 'primary' },
  funded: { label: 'Funded', color: 'info' },
  active: { label: 'In repayment', color: 'warning' },
  repaid: { label: 'Repaid', color: 'success' }
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
