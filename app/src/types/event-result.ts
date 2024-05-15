import type { Result } from 'ethers'

export interface EventResult {
  txHash: string
  date: string
  data: Result
}
