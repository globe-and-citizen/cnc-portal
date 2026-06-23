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
