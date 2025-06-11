export interface VestingRow {
  member: string
  teamId: number
  startDate: string
  durationDays: number
  cliffDays: number
  totalAmount: number
  tokenSymbol: string
  released: number
  status: 'Active' | 'Inactive'
}

export interface TokenSummary {
  symbol: string
  totalVested: number
  totalReleased: number
}
