import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import {
  useBankContractWrite,
  useDepositToken,
  useAddTokenSupport,
  useRemoveTokenSupport,
  usePause,
  useUnpause,
  useTransferOwnership,
  useRenounceOwnership,
  useTransfer,
  useTransferToken,
  useClaimDividend,
  useClaimTokenDividend,
  useDepositDividends,
  useDepositTokenDividends,
  useSetInvestorAddress
} from '../bankWrites'

// Hoisted mock variables
const { mockUseContractWrites, mockTeamStore } = vi.hoisted(() => ({
  mockUseContractWrites: vi.fn(),
  mockTeamStore: {
    getContractAddressByType: vi.fn(() => '0x1234567890123456789012345678901234567890')
  }
}))

// Mock external dependencies
vi.mock('@/composables/contracts/useContractWritesV2', () => ({
  useContractWrites: mockUseContractWrites
}))

vi.mock('@/stores/teamStore', () => ({
  useTeamStore: vi.fn(() => mockTeamStore)
}))


// Test constants
const MOCK_DATA = {
  tokenAddress: '0xA0b86a33E6441bB7bE6d0B9EB5Bbf26b2d60C1cd',
  userAddress: '0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886',
  amount: BigInt('1000000000000000000'),
  tokenAmount: BigInt('1000000')
} as const

const mockContractWrite = {
  writeContract: vi.fn(),
  data: ref(null),
  isPending: ref(false),
  error: ref(null),
  isSuccess: ref(false)
}

describe('Bank Contract Writes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseContractWrites.mockReturnValue(mockContractWrite)
  })

  describe('Core Functionality', () => {
    it.skip('should initialize useBankContractWrite correctly', () => {
      const options = { functionName: 'pause' as const, args: [] }
      useBankContractWrite(options)

      expect(mockUseContractWrites).toHaveBeenCalledWith({
        contractAddress: expect.any(Object),
        abi: expect.any(Array),
        functionName: 'pause',
        args: []
      })
      expect(mockTeamStore.getContractAddressByType).toHaveBeenCalledWith('Bank')
    })

    it('should handle value parameter correctly', () => {
      const value = BigInt(100)
      const options = {
        functionName: 'depositDividends' as const,
        args: ref([MOCK_DATA.amount, MOCK_DATA.userAddress]),
        value: ref(value)
      }

      useBankContractWrite(options)

      expect(mockUseContractWrites).toHaveBeenCalledWith(
        expect.objectContaining({ value: expect.any(Object) })
      )
    })
  })

  describe('Token Operations', () => {
    it('should configure deposit token correctly', () => {
      useDepositToken(MOCK_DATA.tokenAddress, MOCK_DATA.tokenAmount)
      expect(mockUseContractWrites).toHaveBeenCalledWith(
        expect.objectContaining({ functionName: 'depositToken' })
      )
    })

    it('should configure add/remove token support', () => {
      useAddTokenSupport(MOCK_DATA.tokenAddress)
      expect(mockUseContractWrites).toHaveBeenCalledWith(
        expect.objectContaining({ functionName: 'addTokenSupport' })
      )

      useRemoveTokenSupport(MOCK_DATA.tokenAddress)
      expect(mockUseContractWrites).toHaveBeenCalledWith(
        expect.objectContaining({ functionName: 'removeTokenSupport' })
      )
    })

    it('should work with reactive values', () => {
      const token = ref(MOCK_DATA.tokenAddress)
      const amount = ref(MOCK_DATA.tokenAmount)

      useDepositToken(token, amount)
      expect(mockUseContractWrites).toHaveBeenCalledWith(
        expect.objectContaining({ args: expect.any(Object) })
      )
    })
  })

  describe('Dividend Operations', () => {
    it('should configure dividend claiming functions', () => {
      useClaimDividend()
      expect(mockUseContractWrites).toHaveBeenCalledWith(
        expect.objectContaining({ functionName: 'claimDividend', args: [] })
      )

      useClaimTokenDividend(MOCK_DATA.tokenAddress)
      expect(mockUseContractWrites).toHaveBeenCalledWith(
        expect.objectContaining({ functionName: 'claimTokenDividend' })
      )
    })

    it('should configure deposit dividends with value', () => {
      useDepositDividends(MOCK_DATA.amount, MOCK_DATA.userAddress)
      const lastCall = mockUseContractWrites.mock.calls.slice(-1)[0][0]

      expect(lastCall.functionName).toBe('depositDividends')
      expect(lastCall.value).toBeDefined()
    })

    it('should configure deposit token dividends', () => {
      useDepositTokenDividends(MOCK_DATA.tokenAddress, MOCK_DATA.tokenAmount, MOCK_DATA.userAddress)
      expect(mockUseContractWrites).toHaveBeenCalledWith(
        expect.objectContaining({ functionName: 'depositTokenDividends' })
      )
    })
  })

  describe('Administrative Operations', () => {
    it('should configure pause/unpause operations', () => {
      usePause()
      expect(mockUseContractWrites).toHaveBeenCalledWith(
        expect.objectContaining({ functionName: 'pause', args: [] })
      )

      useUnpause()
      expect(mockUseContractWrites).toHaveBeenCalledWith(
        expect.objectContaining({ functionName: 'unpause', args: [] })
      )
    })

    it('should configure ownership operations', () => {
      useTransferOwnership(MOCK_DATA.userAddress)
      expect(mockUseContractWrites).toHaveBeenCalledWith(
        expect.objectContaining({ functionName: 'transferOwnership' })
      )

      useRenounceOwnership()
      expect(mockUseContractWrites).toHaveBeenCalledWith(
        expect.objectContaining({ functionName: 'renounceOwnership', args: [] })
      )
    })

    it('should configure set investor address', () => {
      useSetInvestorAddress(MOCK_DATA.userAddress)
      expect(mockUseContractWrites).toHaveBeenCalledWith(
        expect.objectContaining({ functionName: 'setInvestorAddress' })
      )
    })
  })

  describe('Transfer Operations', () => {
    it('should configure transfer operations', () => {
      useTransfer(MOCK_DATA.userAddress, MOCK_DATA.amount)
      expect(mockUseContractWrites).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'transfer',
          args: [MOCK_DATA.userAddress, MOCK_DATA.amount]
        })
      )

      useTransferToken(MOCK_DATA.tokenAddress, MOCK_DATA.userAddress, MOCK_DATA.tokenAmount)
      expect(mockUseContractWrites).toHaveBeenCalledWith(
        expect.objectContaining({ functionName: 'transferToken' })
      )
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing bank address gracefully', () => {
      // @ts-expect-error testing edge case
      mockTeamStore.getContractAddressByType.mockReturnValue(undefined)
      expect(() => usePause()).not.toThrow()
    })

    it('should return consistent interface', () => {
      const pause = usePause()
      const transfer = useTransfer(MOCK_DATA.userAddress, MOCK_DATA.amount)

      expect(pause).toEqual(mockContractWrite)
      expect(transfer).toEqual(mockContractWrite)
    })

    it('should handle zero and large amounts', () => {
      useTransfer(MOCK_DATA.userAddress, BigInt(0))
      useTransfer(MOCK_DATA.userAddress, BigInt('999999999999999999999999'))
      expect(mockUseContractWrites).toHaveBeenCalledTimes(2)
    })
  })
})
