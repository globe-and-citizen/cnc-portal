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

export interface WhitelistEntry {
  username: string
  address: string
  amount: number | null
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

export interface LenderOffering {
  title: string
  rate: number
  term: number
  access: 'general' | 'whitelist'
  whitelisted?: boolean
  myAllocation?: number
  mode: 'range' | 'fixed'
  min?: number
  max?: number
  fixed?: number
  raised: number
  target: number
  allowed: boolean
  accessLabel: string
  accessBg: string
  accessColor: string
  accessDot: string
  limitsLabel: string
  pct: number
}
