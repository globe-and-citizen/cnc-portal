import type { Abi, Address } from 'viem'
import type { simulateContract, waitForTransactionReceipt } from '@wagmi/core'

export const ADDRESS = '0x1234567890123456789012345678901234567890' as Address
export const HASH = '0xdeadbeef00000000000000000000000000000000000000000000000000000000' as const

export const ABI = [
  {
    type: 'function',
    name: 'foo',
    inputs: [{ name: 'x', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable'
  }
] as const satisfies Abi

export const okSimulation = { request: { __mock: 'request' } } as unknown as Awaited<
  ReturnType<typeof simulateContract>
>

export const successReceipt = (overrides: Partial<{ blockNumber: bigint }> = {}) =>
  ({ status: 'success', blockNumber: 100n, ...overrides }) as unknown as Awaited<
    ReturnType<typeof waitForTransactionReceipt>
  >

export const revertedReceipt = (overrides: Partial<{ blockNumber: bigint }> = {}) =>
  ({ status: 'reverted', blockNumber: 100n, ...overrides }) as unknown as Awaited<
    ReturnType<typeof waitForTransactionReceipt>
  >
