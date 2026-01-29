import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import {
  useErc20Name,
  useErc20Symbol,
  useErc20Decimals,
  useErc20TotalSupply,
  useErc20BalanceOf,
  useErc20Allowance
} from '../reads'
import type { Address } from 'viem'

// Hoisted mock variables
const { mockUseReadContract, mockIsAddress } = vi.hoisted(() => ({
  mockUseReadContract: vi.fn(),
  mockIsAddress: vi.fn()
}))

// Disable global ERC20 reads mock to test actual implementation
vi.unmock('@/composables/erc20/reads')

// Mock external dependencies
vi.mock('@wagmi/vue', () => ({
  useReadContract: mockUseReadContract
}))

vi.mock('viem', async (importOriginal) => {
  const actual = (await importOriginal()) as object
  return {
    ...actual,
    isAddress: mockIsAddress
  }
})

// Test constants
const MOCK_DATA = {
  validAddress: '0x1234567890123456789012345678901234567890' as Address,
  secondAddress: '0xA0b86a33E6441bB7bE6d0B9EB5Bbf26b2d60C1cd' as Address,
  ownerAddress: '0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886' as Address,
  spenderAddress: '0x9876543210987654321098765432109876543210' as Address,
  invalidAddress: 'invalid-address'
} as const

const mockReadContractResult = {
  data: ref(null),
  isLoading: ref(false),
  isError: ref(false),
  error: ref(null),
  isSuccess: ref(true),
  refetch: vi.fn()
}

describe('ERC20 Contract Reads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseReadContract.mockReturnValue(mockReadContractResult)
    mockIsAddress.mockImplementation((address: string) => {
      return /^0x[a-fA-F0-9]{40}$/.test(address)
    })
  })

  describe('useErc20Name', () => {
    it('should call useReadContract with correct parameters', () => {
      useErc20Name(MOCK_DATA.validAddress)

      expect(mockUseReadContract).toHaveBeenCalledWith({
        address: expect.any(Object),
        abi: expect.any(Array),
        functionName: 'name',
        query: { enabled: expect.any(Object) }
      })
    })

    it('should enable query when address is valid', () => {
      useErc20Name(MOCK_DATA.validAddress)

      const callArgs = mockUseReadContract.mock.calls[0][0]
      expect(callArgs.query.enabled.value).toBe(true)
    })

    it('should disable query when address is invalid', () => {
      mockIsAddress.mockReturnValue(false)
      useErc20Name(MOCK_DATA.invalidAddress as Address)

      const callArgs = mockUseReadContract.mock.calls[0][0]
      expect(callArgs.query.enabled.value).toBe(false)
    })

    it('should work with reactive address', () => {
      const address = ref(MOCK_DATA.validAddress)
      useErc20Name(address)

      expect(mockUseReadContract).toHaveBeenCalled()
    })
  })

  describe('useErc20Symbol', () => {
    it('should call useReadContract with correct functionName', () => {
      useErc20Symbol(MOCK_DATA.validAddress)

      const callArgs = mockUseReadContract.mock.calls[0][0]
      expect(callArgs.functionName).toBe('symbol')
    })

    it('should enable query when address is valid', () => {
      useErc20Symbol(MOCK_DATA.validAddress)

      const callArgs = mockUseReadContract.mock.calls[0][0]
      expect(callArgs.query.enabled.value).toBe(true)
    })
  })

  describe('useErc20Decimals', () => {
    it('should call useReadContract with correct functionName', () => {
      useErc20Decimals(MOCK_DATA.validAddress)

      const callArgs = mockUseReadContract.mock.calls[0][0]
      expect(callArgs.functionName).toBe('decimals')
    })

    it('should enable query when address is valid', () => {
      useErc20Decimals(MOCK_DATA.validAddress)

      const callArgs = mockUseReadContract.mock.calls[0][0]
      expect(callArgs.query.enabled.value).toBe(true)
    })
  })

  describe('useErc20TotalSupply', () => {
    it('should call useReadContract with correct functionName', () => {
      useErc20TotalSupply(MOCK_DATA.validAddress)

      const callArgs = mockUseReadContract.mock.calls[0][0]
      expect(callArgs.functionName).toBe('totalSupply')
    })

    it('should enable query when address is valid', () => {
      useErc20TotalSupply(MOCK_DATA.validAddress)

      const callArgs = mockUseReadContract.mock.calls[0][0]
      expect(callArgs.query.enabled.value).toBe(true)
    })
  })

  describe('useErc20BalanceOf', () => {
    it('should call useReadContract with correct parameters', () => {
      useErc20BalanceOf(MOCK_DATA.validAddress, MOCK_DATA.ownerAddress)

      expect(mockUseReadContract).toHaveBeenCalledWith({
        address: expect.any(Object),
        abi: expect.any(Array),
        functionName: 'balanceOf',
        args: expect.any(Array),
        query: { enabled: expect.any(Object) }
      })
    })

    it('should enable query when both addresses are valid', () => {
      useErc20BalanceOf(MOCK_DATA.validAddress, MOCK_DATA.ownerAddress)

      const callArgs = mockUseReadContract.mock.calls[0][0]
      expect(callArgs.query.enabled.value).toBe(true)
    })

    it('should disable query when account address is undefined', () => {
      useErc20BalanceOf(MOCK_DATA.validAddress, undefined as unknown as Address)

      const callArgs = mockUseReadContract.mock.calls[0][0]
      expect(callArgs.query.enabled.value).toBe(false)
    })

    it('should properly compute args with account address', () => {
      useErc20BalanceOf(MOCK_DATA.validAddress, MOCK_DATA.ownerAddress)

      const callArgs = mockUseReadContract.mock.calls[0][0]
      expect(callArgs.args).toHaveLength(1)
      expect(callArgs.args[0].value).toBe(MOCK_DATA.ownerAddress)
    })
  })

  describe('useErc20Allowance', () => {
    it('should call useReadContract with correct parameters', () => {
      useErc20Allowance(MOCK_DATA.validAddress, MOCK_DATA.ownerAddress, MOCK_DATA.spenderAddress)

      expect(mockUseReadContract).toHaveBeenCalledWith({
        address: expect.any(Object),
        abi: expect.any(Array),
        functionName: 'allowance',
        args: expect.any(Array),
        query: { enabled: expect.any(Object) }
      })
    })

    it('should enable query when all addresses are valid', () => {
      useErc20Allowance(MOCK_DATA.validAddress, MOCK_DATA.ownerAddress, MOCK_DATA.spenderAddress)

      const callArgs = mockUseReadContract.mock.calls[0][0]
      expect(callArgs.query.enabled.value).toBe(true)
    })

    it('should disable query when owner address is undefined', () => {
      useErc20Allowance(
        MOCK_DATA.validAddress,
        undefined as unknown as Address,
        MOCK_DATA.spenderAddress
      )

      const callArgs = mockUseReadContract.mock.calls[0][0]
      expect(callArgs.query.enabled.value).toBe(false)
    })

    it('should properly compute args with owner and spender addresses', () => {
      useErc20Allowance(MOCK_DATA.validAddress, MOCK_DATA.ownerAddress, MOCK_DATA.spenderAddress)

      const callArgs = mockUseReadContract.mock.calls[0][0]
      expect(callArgs.args).toHaveLength(2)
      expect(callArgs.args[0].value).toBe(MOCK_DATA.ownerAddress)
      expect(callArgs.args[1].value).toBe(MOCK_DATA.spenderAddress)
    })
  })

  describe('Edge Cases', () => {
    it('should handle address changes for reactive refs', () => {
      const address = ref(MOCK_DATA.validAddress)
      useErc20Name(address)

      const callArgs = mockUseReadContract.mock.calls[0][0]
      expect(callArgs.address.value).toBe(MOCK_DATA.validAddress)

      address.value = MOCK_DATA.secondAddress
      expect(callArgs.address.value).toBe(MOCK_DATA.secondAddress)
    })

    it('should return consistent interface for all functions', () => {
      const name = useErc20Name(MOCK_DATA.validAddress)
      const symbol = useErc20Symbol(MOCK_DATA.validAddress)
      const decimals = useErc20Decimals(MOCK_DATA.validAddress)
      const totalSupply = useErc20TotalSupply(MOCK_DATA.validAddress)
      const balance = useErc20BalanceOf(MOCK_DATA.validAddress, MOCK_DATA.ownerAddress)
      const allowance = useErc20Allowance(
        MOCK_DATA.validAddress,
        MOCK_DATA.ownerAddress,
        MOCK_DATA.spenderAddress
      )

      expect(name).toEqual(mockReadContractResult)
      expect(symbol).toEqual(mockReadContractResult)
      expect(decimals).toEqual(mockReadContractResult)
      expect(totalSupply).toEqual(mockReadContractResult)
      expect(balance).toEqual(mockReadContractResult)
      expect(allowance).toEqual(mockReadContractResult)
    })

    it('should properly handle computed enabled state', () => {
      const address = ref(MOCK_DATA.validAddress)
      useErc20Name(address)

      const callArgs = mockUseReadContract.mock.calls[0][0]
      expect(callArgs.query.enabled.value).toBe(true)

      address.value = undefined as unknown as Address
      expect(callArgs.query.enabled.value).toBe(false)
    })
  })
})
