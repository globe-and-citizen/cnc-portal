import type { Address } from 'viem'

export interface Action {
  id: number
  actionId: number
  targetAddress: Address
  description: string
  userAddress: Address
  isExecuted: boolean
  data: `0x${string}`
  teamId: number
  createdAt?: string
}

export interface ActionResponse {
  success: boolean
  data: Action[]
  total: number
}
