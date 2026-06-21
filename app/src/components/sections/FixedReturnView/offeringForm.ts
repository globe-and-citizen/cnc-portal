export type TermUnit = 'days' | 'months' | 'years'

export interface OfferingForm {
  title: string
  purpose: string
  principal: number
  rate: number
  termValue: number
  termUnit: TermUnit
  startDate: string
  deadline: string
  access: 'general' | 'whitelist'
  capOn: boolean
  cap: number
  token: string | undefined
}

export interface OfferingSummary {
  id: string
  title: string
  rate: number
  term: number
  startDate: string
  access: 'general' | 'whitelist'
  raised: number
  target: number
  status: 'open' | 'funded' | 'closed'
}

export function moneyShort(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US')
}

export function money(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function pickerClass(active: boolean) {
  return [
    'flex flex-col gap-0.5 items-start text-left px-3 py-2 rounded-lg cursor-pointer border-2 transition-all',
    active ? 'border-[#00bf7a] bg-[#f0fbf6] text-[#0a7a52]' : 'border-[#e0eae5] bg-white text-[#46584f]'
  ]
}

export function sumWhitelistAmount(whitelist: { amount: number | null }[]): number {
  return whitelist.reduce((sum, w) => sum + (w.amount ?? 0), 0)
}

export function fmtDate(str: string): string {
  const d = new Date(str + 'T00:00:00')
  if (isNaN(d.getTime())) return str
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${String(d.getDate()).padStart(2, '0')} ${m[d.getMonth()]} ${d.getFullYear()}`
}

export function termToYears(value: number, unit: TermUnit): number {
  if (unit === 'days') return value / 365
  if (unit === 'months') return value / 12
  return value
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
