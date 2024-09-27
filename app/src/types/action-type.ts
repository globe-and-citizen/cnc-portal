export interface Action {
  id: bigint;
  target: `0x${string}`
  description: string
  approvalCount: bigint
  isExecuted: boolean
  data: `0x${string}`
}
