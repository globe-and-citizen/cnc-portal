import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deployContract, getContractData } from '../useContractFunctions'
import { parseUnits, formatUnits } from 'viem/utils'
import type { Abi, Address } from 'viem'
import { mockWagmiCore } from '@/tests/mocks'
import { useMutationFn, smartUseMutation } from '@/tests/mocks/composables.mock'

//  Declare only the composable-specific mock (wallet client) with vi.hoisted
const { mockDeployContract, mockWalletClient } = vi.hoisted(() => {
  const mockDeployContract = vi.fn()

  return {
    mockDeployContract,
    mockWalletClient: {
      deployContract: mockDeployContract,
      account: { address: '0xabc' }
    }
  }
})

// @wagmi/vue and @wagmi/core are mocked globally - no need to re-declare them here
// Just configure specific behaviors in beforeEach

describe('deployContract', () => {
  const mockAbi: Abi = [
    {
      type: 'constructor',
      stateMutability: 'nonpayable',
      inputs: [
        { name: '_click', type: 'uint256' },
        { name: '_impression', type: 'uint256' },
        { name: '_bank', type: 'address' }
      ]
    }
  ]

  const mockBytecode = '0x123456' as const

  beforeEach(() => {
    vi.clearAllMocks()
    mockWagmiCore.getWalletClient.mockResolvedValue(mockWalletClient)
    mockWagmiCore.waitForTransactionReceipt.mockResolvedValue({
      contractAddress: '0xDEADBEEF'
    } as never)
  })

  it('deploys with the correct args and returns the new contract address', async () => {
    mockDeployContract.mockResolvedValue('0xHASH')

    const address = await deployContract(mockAbi, mockBytecode, {
      bankAddress: '0xBANK',
      costPerClick: '1.5',
      costPerImpression: '2.5'
    })

    expect(mockDeployContract).toHaveBeenCalledWith({
      abi: mockAbi,
      bytecode: mockBytecode,
      args: [parseUnits('1.5', 18), parseUnits('2.5', 18), '0xBANK'],
      account: '0xabc'
    })

    expect(address).toBe('0xDEADBEEF')
  })

  it('throws when the wallet is not connected', async () => {
    mockWagmiCore.getWalletClient.mockResolvedValueOnce(null)

    await expect(
      deployContract(mockAbi, mockBytecode, {
        bankAddress: '0xBANK',
        costPerClick: '1',
        costPerImpression: '1'
      })
    ).rejects.toThrow('Wallet not connected')
  })

  it('throws when the receipt has no contract address', async () => {
    mockDeployContract.mockResolvedValue('0xHASH')
    mockWagmiCore.waitForTransactionReceipt.mockResolvedValueOnce({
      contractAddress: null
    } as never)

    await expect(
      deployContract(mockAbi, mockBytecode, {
        bankAddress: '0xBANK',
        costPerClick: '1',
        costPerImpression: '1'
      })
    ).rejects.toThrow('no contract address')
  })
})

describe('useDeployContract', () => {
  const mockAbi: Abi = [{ type: 'constructor', stateMutability: 'nonpayable', inputs: [] }]
  const mockBytecode = '0x123456' as const

  beforeEach(() => {
    vi.clearAllMocks()
    mockWagmiCore.getWalletClient.mockResolvedValue(mockWalletClient)
    mockWagmiCore.waitForTransactionReceipt.mockResolvedValue({
      contractAddress: '0xDEADBEEF'
    } as never)
    mockDeployContract.mockResolvedValue('0xHASH')
  })

  it('runs deployContract through the mutation and resolves the address', async () => {
    // Reach past the global hook mock for the real wrapper; deps stay mocked.
    const { useDeployContract } =
      await vi.importActual<typeof import('../useContractFunctions')>('../useContractFunctions')
    useMutationFn.mockImplementationOnce(smartUseMutation)

    const mutation = useDeployContract(mockAbi, mockBytecode)
    await expect(
      mutation.mutateAsync({ bankAddress: '0xBANK', costPerClick: '1', costPerImpression: '1' })
    ).resolves.toBe('0xDEADBEEF')
  })
})

describe('getContractData', () => {
  const mockAbi: Abi = [
    {
      type: 'function',
      name: 'getName',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'string', name: '' }]
    },
    {
      type: 'function',
      name: 'getPrice',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'uint256', name: '' }]
    },
    {
      type: 'function',
      name: 'setName',
      stateMutability: 'nonpayable',
      inputs: [{ name: '_name', type: 'string' }],
      outputs: []
    }
  ]

  const address = '0x1234567890123456789012345678901234567890' as Address

  beforeEach(() => {
    vi.clearAllMocks()
    mockWagmiCore.getWalletClient.mockResolvedValue(mockWalletClient)
  })

  it('should return readable data for view functions without params', async () => {
    mockWagmiCore.readContract.mockImplementationOnce(() => 'Project X')
    mockWagmiCore.readContract.mockImplementationOnce(() => BigInt('1000000000000000000'))

    const result = await getContractData(address, mockAbi)

    expect(result).toEqual([
      { key: 'getName', value: 'Project X' },
      { key: 'getPrice', value: formatUnits(BigInt('1000000000000000000'), 18) }
    ])
  })

  it('should skip functions with inputs', async () => {
    const data = await getContractData(address, [mockAbi[2]])
    expect(data).toEqual([])
    expect(mockWagmiCore.readContract).not.toHaveBeenCalled()
  })

  it('should handle errors gracefully', async () => {
    mockWagmiCore.readContract.mockImplementation(() => {
      throw new Error('Read failed')
    })

    const data = await getContractData(address, [mockAbi[0]])
    expect(data).toEqual([])
  })
})
