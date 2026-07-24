import { MINUTES_PER_DAY } from './communityCreditUtil'
import type { CreditCallForm } from '@/types'

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

/** Confirmation-delay buffer added to the device clock when validating a Community
 *  Credit subscription deadline — covers ordinary delay between validating client-side
 *  and the transaction actually landing. FixedReturn.sol itself requires
 *  subscriptionDeadline to be strictly in the future regardless; this only tries to
 *  give an accurate error before submitting, not the source of truth. */
export const CREDIT_DEADLINE_BUFFER_MS = 60_000

/** Shared `{ today, now }` context for createCreditCallTermsSchema, anchored on the
 *  device clock (not useBlockTimestamp — that composable only updates on new blocks, so
 *  it can hold an arbitrarily stale reading on a chain that's sat idle) plus
 *  CREDIT_DEADLINE_BUFFER_MS. Used both by the Terms step's own validate() and again
 *  immediately before publish — a deadline that passed validation on the Terms step can
 *  go stale while the issuer spends time on the Access step afterward, so both call
 *  sites need to read the exact same clock+buffer logic rather than each rolling their
 *  own. */
export function creditCallDeadlineContext(): { today: string; now: Date } {
  const now = new Date(Date.now() + CREDIT_DEADLINE_BUFFER_MS)
  return { today: now.toISOString().slice(0, 10), now }
}

/** Default field values for a brand-new Community Credit wizard form — pulled out of
 *  NewView.vue so the component doesn't have to inline the whole literal. */
export function createDefaultCreditCallForm(): CreditCallForm {
  return {
    name: '',
    desc: '',
    target: '25000',
    token: 'USDC',
    rate: '6',
    period: 90 * MINUTES_PER_DAY,
    periodMode: 'preset',
    periodVal: '90',
    periodUnit: 'days',
    deadline: '2026-07-31',
    deadlineTime: '23:59',
    access: 'everyone',
    whitelist: [],
    capOn: false,
    cap: ''
  }
}
