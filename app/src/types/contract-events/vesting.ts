export type VestingCreatedRow = {
  id: string
  contractAddress: string
  member: string
  scheduleIndex: string
  amount: string
  timestamp: number
}

export type VestingTokensReleasedRow = {
  id: string
  contractAddress: string
  member: string
  scheduleIndex: string
  amount: string
  timestamp: number
}

export type VestingStoppedRow = {
  id: string
  contractAddress: string
  member: string
  scheduleIndex: string
  timestamp: number
}

export type VestingEventFeed = {
  vestingCreateds: { items: VestingCreatedRow[] }
  vestingTokensReleaseds: { items: VestingTokensReleasedRow[] }
  vestingStoppeds: { items: VestingStoppedRow[] }
}
