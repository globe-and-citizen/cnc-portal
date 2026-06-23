import type { TermUnit } from '@/types'

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
