export interface Action {
  id: number
  actionId: number
  targetAddress: `0x${string}`
  description: string
  userAddress: `0x${string}`
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
