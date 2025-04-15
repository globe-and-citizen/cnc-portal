import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useDeployContract, getContractData } from '../useContractFunctions'
import { ref, nextTick } from 'vue'
import { parseUnits, formatUnits } from 'viem/utils'
import type { Abi, Address } from 'viem'

//  Declare all mocks with vi.hoisted to avoid hoisting errors
const { mockGetWalletClient, mockReadContract, mockDeployContract, mockWalletClient } = vi.hoisted(
  () => {
    const mockDeployContract = vi.fn()

    return {
      mockGetWalletClient: vi.fn(),
      mockReadContract: vi.fn(),
      mockDeployContract,
      mockWalletClient: {
        deployContract: mockDeployContract,
        account: { address: '0xabc' }
      }
    }
  }
)

const mockUseWaitForTransactionReceipt = {
  data: ref({ contractAddress: '0xDEADBEEF' }),
  isSuccess: ref(true),
  isLoading: ref(false)
}

//  Mock @wagmi/vue
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useWaitForTransactionReceipt: vi.fn(() => mockUseWaitForTransactionReceipt)
  }
})

//  Mock @wagmi/core
vi.mock('@wagmi/core', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    getWalletClient: mockGetWalletClient,
    readContract: mockReadContract
  }
})

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
    mockGetWalletClient.mockResolvedValue(mockWalletClient)
    mockUseWaitForTransactionReceipt.data.value = { contractAddress: '0xDEADBEEF' }
    mockUseWaitForTransactionReceipt.isSuccess.value = true
    mockUseWaitForTransactionReceipt.isLoading.value = false
  })

  it('should deploy contract with correct args', async () => {
    mockDeployContract.mockResolvedValue('0xHASH')

    // Initially loading
    mockUseWaitForTransactionReceipt.isLoading.value = true
    mockUseWaitForTransactionReceipt.isSuccess.value = true
    mockUseWaitForTransactionReceipt.data.value = { contractAddress: '0xDEADBEEF' }

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
    mockGetWalletClient.mockResolvedValueOnce(null)

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
    mockGetWalletClient.mockResolvedValue(mockWalletClient)
  })

  it('should return readable data for view functions without params', async () => {
    mockReadContract.mockImplementationOnce(() => 'Project X')
    mockReadContract.mockImplementationOnce(() => BigInt('1000000000000000000'))

    const result = await getContractData(address, mockAbi)

    expect(result).toEqual([
      { key: 'getName', value: 'Project X' },
      { key: 'getPrice', value: formatUnits(BigInt('1000000000000000000'), 18) }
    ])
  })

  it('should skip functions with inputs', async () => {
    const data = await getContractData(address, [mockAbi[2]])
    expect(data).toEqual([])
    expect(mockReadContract).not.toHaveBeenCalled()
  })

  it('should handle errors gracefully', async () => {
    mockReadContract.mockImplementation(() => {
      throw new Error('Read failed')
    })

    const data = await getContractData(address, [mockAbi[0]])
    expect(data).toEqual([])
  })
})
