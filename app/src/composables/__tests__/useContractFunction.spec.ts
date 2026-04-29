import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getContractData } from '../useContractFunctions'
import { nextTick } from 'vue'
import { parseUnits, formatUnits } from 'viem/utils'
import type { Abi, Address } from 'viem'
import { mockUseWaitForTransactionReceipt, mockWagmiCore } from '@/tests/mocks'

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

describe('useDeployContract', () => {
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
    mockUseWaitForTransactionReceipt.data.value = { contractAddress: '0xDEADBEEF' } as never
    mockUseWaitForTransactionReceipt.isSuccess.value = true
    mockUseWaitForTransactionReceipt.isLoading.value = false
  })

  const getActualUseDeployContract = async () => {
    const actual =
      await vi.importActual<typeof import('../useContractFunctions')>('../useContractFunctions')

    return actual.useDeployContract
  }

  it('should deploy contract with correct args', async () => {
    mockDeployContract.mockResolvedValue('0xHASH')

    // Initially loading
    mockUseWaitForTransactionReceipt.isLoading.value = true
    mockUseWaitForTransactionReceipt.isSuccess.value = true
    mockUseWaitForTransactionReceipt.data.value = { contractAddress: '0xDEADBEEF' } as never

    const useDeployContract = await getActualUseDeployContract()
    const { deploy, contractAddress, error, isDeploying } = useDeployContract(mockAbi, mockBytecode)
    await deploy('0xBANK', '1.5', '2.5')

    // Simulate confirmation step
    mockUseWaitForTransactionReceipt.isLoading.value = false
    await nextTick()

    expect(mockDeployContract).toHaveBeenCalledWith({
      abi: mockAbi,
      bytecode: mockBytecode,
      args: [parseUnits('1.5', 18), parseUnits('2.5', 18), '0xBANK'],
      account: '0xabc'
    })

    expect(contractAddress.value).toBe('0xDEADBEEF')
    expect(error.value).toBeNull()
    expect(isDeploying.value).toBe(false)
  })

  it('should handle wallet not connected error', async () => {
    mockWagmiCore.getWalletClient.mockResolvedValueOnce(null)

    const useDeployContract = await getActualUseDeployContract()
    const { deploy, error, contractAddress, isDeploying } = useDeployContract(mockAbi, mockBytecode)
    await deploy('0xBANK', '1', '1')

    expect(error.value).toBeInstanceOf(Error)
    expect(error.value?.message).toBe('Wallet not connected')
    expect(contractAddress.value).toBeNull()
    expect(isDeploying.value).toBe(false)
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
