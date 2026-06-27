import { parseUnits, type Address } from 'viem'
import { SUPPORTED_TOKENS } from '@/constant'
import type { FixedReturnOfferParams, OfferingForm, TermUnit, WhitelistEntry } from '@/types'

const TERM_UNIT_INDEX: Record<TermUnit, 0 | 1 | 2> = { days: 0, months: 1, years: 2 }
const FUNDING_ACCESS_INDEX: Record<OfferingForm['access'], 0 | 1> = { general: 0, whitelist: 1 }

export function moneyShort(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US')
}

export function pickerClass(active: boolean) {
  return [
    'flex flex-col gap-0.5 items-start text-left px-3 py-2 rounded-lg cursor-pointer border-2 transition-all',
    active
      ? 'border-[#00bf7a] bg-[#f0fbf6] text-[#0a7a52]'
      : 'border-[#e0eae5] bg-white text-[#46584f]'
  ]
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

function toUnixSeconds(dateStr: string): bigint {
  return BigInt(Math.floor(new Date(`${dateStr}T00:00:00Z`).getTime() / 1000))
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
    startDate: toUnixSeconds(form.startDate),
    subscriptionDeadline: toUnixSeconds(form.deadline),
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
