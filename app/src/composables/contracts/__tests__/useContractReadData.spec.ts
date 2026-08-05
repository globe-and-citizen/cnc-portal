import { beforeEach, describe, expect, it } from 'vitest'
import type { Abi, Address } from 'viem'
import { mockWagmiCore } from '@/tests/mocks'
import { readContractData } from '../useContractReadData'

const address = '0x1234567890123456789012345678901234567890' as Address
const abi: Abi = [
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }]
  },
  {
    type: 'function',
    name: 'totalMembers',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'members',
    stateMutability: 'view',
    inputs: [{ name: 'index', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }]
  }
]

describe('readContractData', () => {
  beforeEach(() => {
    mockWagmiCore.readContract.mockReset()
  })

  it('reads and formats every zero-argument view without treating bigint values as tokens', async () => {
    mockWagmiCore.readContract
      .mockResolvedValueOnce('0x9999999999999999999999999999999999999999')
      .mockResolvedValueOnce(42n)

    await expect(readContractData(address, abi)).resolves.toEqual({
      fields: [
        {
          functionName: 'owner',
          label: 'Owner',
          value: '0x9999999999999999999999999999999999999999',
          outputType: 'address',
          isAddress: true
        },
        {
          functionName: 'totalMembers',
          label: 'Total Members',
          value: '42',
          outputType: 'uint256',
          isAddress: false
        }
      ],
      failedCount: 0,
      totalCount: 2
    })
    expect(mockWagmiCore.readContract).toHaveBeenCalledTimes(2)
  })

  it('keeps successful values when only some contract reads fail', async () => {
    mockWagmiCore.readContract
      .mockResolvedValueOnce('0x9999999999999999999999999999999999999999')
      .mockRejectedValueOnce(new Error('unsupported read'))

    const result = await readContractData(address, abi)

    expect(result.fields).toHaveLength(1)
    expect(result.failedCount).toBe(1)
    expect(result.totalCount).toBe(2)
  })

  it('returns an empty result when the ABI has no zero-argument reads', async () => {
    const result = await readContractData(address, [abi[2]])

    expect(result).toEqual({ fields: [], failedCount: 0, totalCount: 0 })
    expect(mockWagmiCore.readContract).not.toHaveBeenCalled()
  })

  it('surfaces an error when every eligible read fails', async () => {
    mockWagmiCore.readContract.mockRejectedValue(new Error('RPC unavailable'))

    await expect(readContractData(address, abi)).rejects.toThrow(
      'Contract data could not be loaded'
    )
  })
})
