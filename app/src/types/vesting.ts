export interface VestingRow {
  member: string
  teamId: number
  startDate: string
  durationDays: number
  cliffDays: number
  totalAmount: number
  tokenSymbol: string
  released: number
  status: 'Active' | 'Inactive' | 'Completed'
  isStarted?: boolean
}

export interface TokenSummary {
  symbol: string
  totalVested: number
  totalReleased: number
  totalWithdrawn: number
}

export interface VestingInfo {
  start: number
  duration: number
  cliff: number
  totalAmount: bigint
  released: bigint
  active: boolean
}

export type VestingTuple = [string[], VestingInfo[]]
