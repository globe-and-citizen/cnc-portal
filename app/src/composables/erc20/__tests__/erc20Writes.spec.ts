import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import {
  useERC20ContractWrite,
  useERC20Transfer,
  useERC20TransferFrom,
  useERC20Approve
} from '../erc20Writes'
import type { Address } from 'viem'

// Hoisted mock variables
const { mockUseContractWrites } = vi.hoisted(() => ({
  mockUseContractWrites: vi.fn()
}))

// Mock external dependencies
vi.mock('@/composables/contracts/useContractWritesV2', () => ({
  useContractWrites: mockUseContractWrites
}))

// Test constants
const MOCK_DATA = {
  contractAddress: '0x1234567890123456789012345678901234567890' as Address,
  to: '0xA0b86a33E6441bB7bE6d0B9EB5Bbf26b2d60C1cd' as Address,
  from: '0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886' as Address,
  spender: '0x9876543210987654321098765432109876543210' as Address,
  amount: BigInt('1000000000000000000'), // 1 token with 18 decimals
  largeAmount: BigInt('999999999999999999999999'),
  zeroAmount: BigInt(0)
} as const

const mockContractWrite = {
  writeResult: { data: ref(null) },
  receiptResult: { data: ref(null) },
  simulateGasResult: { data: ref(null) },
  executeWrite: vi.fn(),
  invalidateQueries: vi.fn(),
  currentStep: ref('idle'),
  timelineSteps: ref([])
}

describe('ERC20 Contract Writes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseContractWrites.mockReturnValue(mockContractWrite)
  })

  describe('useERC20ContractWrite', () => {
    it('should call useContractWrites with correct parameters', () => {
      const options = {
        contractAddress: MOCK_DATA.contractAddress,
        functionName: 'transfer' as const,
        args: ref([MOCK_DATA.to, MOCK_DATA.amount] as const)
      }

      useERC20ContractWrite(options)

      expect(mockUseContractWrites).toHaveBeenCalledWith({
        contractAddress: MOCK_DATA.contractAddress,
        abi: expect.any(Array),
        functionName: 'transfer',
        args: expect.any(Object)
      })
    })

    it('should handle value parameter correctly', () => {
      const value = BigInt('500000000000000000')
      const options = {
        contractAddress: MOCK_DATA.contractAddress,
        functionName: 'transfer' as const,
        args: ref([MOCK_DATA.to, MOCK_DATA.amount] as const),
        value: ref(value)
      }

      useERC20ContractWrite(options)

      expect(mockUseContractWrites).toHaveBeenCalledWith(
        expect.objectContaining({
          value: expect.any(Object)
        })
      )
    })

    it('should use empty array when args is not provided', () => {
      const options = {
        contractAddress: MOCK_DATA.contractAddress,
        functionName: 'approve' as const
      }

      useERC20ContractWrite(options)

      expect(mockUseContractWrites).toHaveBeenCalledWith(
        expect.objectContaining({
          args: []
        })
      )
    })

    it('should work with reactive contract address', () => {
      const contractAddress = ref(MOCK_DATA.contractAddress)
      const options = {
        contractAddress,
        functionName: 'transfer' as const,
        args: ref([MOCK_DATA.to, MOCK_DATA.amount] as const)
      }

      useERC20ContractWrite(options)

      expect(mockUseContractWrites).toHaveBeenCalledWith(
        expect.objectContaining({
          contractAddress: expect.any(Object)
        })
      )
    })

    it('should work with undefined contract address', () => {
      const options = {
        contractAddress: undefined,
        functionName: 'transfer' as const,
        args: ref([MOCK_DATA.to, MOCK_DATA.amount] as const)
      }

      useERC20ContractWrite(options)

      expect(mockUseContractWrites).toHaveBeenCalledWith(
        expect.objectContaining({
          contractAddress: undefined
        })
      )
    })

    it('should not include value when value is undefined', () => {
      const options = {
        contractAddress: MOCK_DATA.contractAddress,
        functionName: 'transfer' as const,
        args: ref([MOCK_DATA.to, MOCK_DATA.amount] as const)
      }

      useERC20ContractWrite(options)

      const callArgs = mockUseContractWrites.mock.calls[0][0]
      expect(callArgs).not.toHaveProperty('value')
    })
  })

  describe('useERC20Transfer', () => {
    it('should configure transfer with correct parameters', () => {
      useERC20Transfer(MOCK_DATA.contractAddress, MOCK_DATA.to, MOCK_DATA.amount)

      expect(mockUseContractWrites).toHaveBeenCalledWith(
        expect.objectContaining({
          contractAddress: MOCK_DATA.contractAddress,
          functionName: 'transfer'
        })
      )
    })

    it('should properly compute args with unref', () => {
      useERC20Transfer(MOCK_DATA.contractAddress, MOCK_DATA.to, MOCK_DATA.amount)

      const callArgs = mockUseContractWrites.mock.calls[0][0]
      // Trigger the computed function by accessing value
      const argsValue = callArgs.args.value
      expect(Array.isArray(argsValue)).toBe(true)
      expect(argsValue).toHaveLength(2)
    })

    it('should work with static parameters', () => {
      useERC20Transfer(MOCK_DATA.contractAddress, MOCK_DATA.to, MOCK_DATA.amount)

      expect(mockUseContractWrites).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.any(Object)
        })
      )
    })

    it('should work with reactive parameters', () => {
      const contractAddress = ref(MOCK_DATA.contractAddress)
      const to = ref(MOCK_DATA.to)
      const amount = ref(MOCK_DATA.amount)

      useERC20Transfer(contractAddress, to, amount)

      expect(mockUseContractWrites).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'transfer',
          args: expect.any(Object)
        })
      )
    })

    it('should handle zero amount', () => {
      useERC20Transfer(MOCK_DATA.contractAddress, MOCK_DATA.to, MOCK_DATA.zeroAmount)

      expect(mockUseContractWrites).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'transfer'
        })
      )
    })

    it('should handle large amounts', () => {
      useERC20Transfer(MOCK_DATA.contractAddress, MOCK_DATA.to, MOCK_DATA.largeAmount)

      expect(mockUseContractWrites).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'transfer'
        })
      )
    })

    it('should return contract write interface', () => {
      const result = useERC20Transfer(MOCK_DATA.contractAddress, MOCK_DATA.to, MOCK_DATA.amount)

      expect(result).toEqual(mockContractWrite)
    })
  })

  describe('useERC20TransferFrom', () => {
    it('should configure transferFrom with correct parameters', () => {
      useERC20TransferFrom(
        MOCK_DATA.contractAddress,
        MOCK_DATA.from,
        MOCK_DATA.to,
        MOCK_DATA.amount
      )

      expect(mockUseContractWrites).toHaveBeenCalledWith(
        expect.objectContaining({
          contractAddress: MOCK_DATA.contractAddress,
          functionName: 'transferFrom'
        })
      )
    })

    it('should properly compute args with unref', () => {
      useERC20TransferFrom(
        MOCK_DATA.contractAddress,
        MOCK_DATA.from,
        MOCK_DATA.to,
        MOCK_DATA.amount
      )

      const callArgs = mockUseContractWrites.mock.calls[0][0]
      const argsValue = callArgs.args.value
      expect(Array.isArray(argsValue)).toBe(true)
      expect(argsValue).toHaveLength(3)
    })

    it('should handle all three arguments correctly', () => {
      useERC20TransferFrom(
        MOCK_DATA.contractAddress,
        MOCK_DATA.from,
        MOCK_DATA.to,
        MOCK_DATA.amount
      )

      expect(mockUseContractWrites).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.any(Object)
        })
      )
    })

    it('should work with reactive parameters', () => {
      const contractAddress = ref(MOCK_DATA.contractAddress)
      const from = ref(MOCK_DATA.from)
      const to = ref(MOCK_DATA.to)
      const amount = ref(MOCK_DATA.amount)

      useERC20TransferFrom(contractAddress, from, to, amount)

      expect(mockUseContractWrites).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'transferFrom',
          args: expect.any(Object)
        })
      )
    })

    it('should work with static parameters', () => {
      useERC20TransferFrom(
        MOCK_DATA.contractAddress,
        MOCK_DATA.from,
        MOCK_DATA.to,
        MOCK_DATA.amount
      )

      expect(mockUseContractWrites).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'transferFrom'
        })
      )
    })

    it('should handle zero amount', () => {
      useERC20TransferFrom(
        MOCK_DATA.contractAddress,
        MOCK_DATA.from,
        MOCK_DATA.to,
        MOCK_DATA.zeroAmount
      )

      expect(mockUseContractWrites).toHaveBeenCalled()
    })

    it('should handle large amounts', () => {
      useERC20TransferFrom(
        MOCK_DATA.contractAddress,
        MOCK_DATA.from,
        MOCK_DATA.to,
        MOCK_DATA.largeAmount
      )

      expect(mockUseContractWrites).toHaveBeenCalled()
    })

    it('should return contract write interface', () => {
      const result = useERC20TransferFrom(
        MOCK_DATA.contractAddress,
        MOCK_DATA.from,
        MOCK_DATA.to,
        MOCK_DATA.amount
      )

      expect(result).toEqual(mockContractWrite)
    })
  })

  describe('useERC20Approve', () => {
    it('should configure approve with correct parameters', () => {
      useERC20Approve(MOCK_DATA.contractAddress, MOCK_DATA.spender, MOCK_DATA.amount)

      expect(mockUseContractWrites).toHaveBeenCalledWith(
        expect.objectContaining({
          contractAddress: MOCK_DATA.contractAddress,
          functionName: 'approve'
        })
      )
    })

    it('should properly compute args with unref', () => {
      useERC20Approve(MOCK_DATA.contractAddress, MOCK_DATA.spender, MOCK_DATA.amount)

      const callArgs = mockUseContractWrites.mock.calls[0][0]
      const argsValue = callArgs.args.value
      expect(Array.isArray(argsValue)).toBe(true)
      expect(argsValue).toHaveLength(2)
    })

    it('should work with static parameters', () => {
      useERC20Approve(MOCK_DATA.contractAddress, MOCK_DATA.spender, MOCK_DATA.amount)

      expect(mockUseContractWrites).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.any(Object)
        })
      )
    })

    it('should work with reactive parameters', () => {
      const contractAddress = ref(MOCK_DATA.contractAddress)
      const spender = ref(MOCK_DATA.spender)
      const amount = ref(MOCK_DATA.amount)

      useERC20Approve(contractAddress, spender, amount)

      expect(mockUseContractWrites).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'approve',
          args: expect.any(Object)
        })
      )
    })

    it('should handle zero amount (revoke approval)', () => {
      useERC20Approve(MOCK_DATA.contractAddress, MOCK_DATA.spender, MOCK_DATA.zeroAmount)

      expect(mockUseContractWrites).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'approve'
        })
      )
    })

    it('should handle large amounts (max approval)', () => {
      useERC20Approve(MOCK_DATA.contractAddress, MOCK_DATA.spender, MOCK_DATA.largeAmount)

      expect(mockUseContractWrites).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'approve'
        })
      )
    })

    it('should return contract write interface', () => {
      const result = useERC20Approve(
        MOCK_DATA.contractAddress,
        MOCK_DATA.spender,
        MOCK_DATA.amount
      )

      expect(result).toEqual(mockContractWrite)
    })
  })

  describe('Edge Cases', () => {
    it('should handle mixed reactive and static parameters', () => {
      const contractAddress = ref(MOCK_DATA.contractAddress)
      const to = MOCK_DATA.to
      const amount = ref(MOCK_DATA.amount)

      useERC20Transfer(contractAddress, to, amount)

      expect(mockUseContractWrites).toHaveBeenCalled()
    })

    it('should return consistent interface for all functions', () => {
      const transfer = useERC20Transfer(
        MOCK_DATA.contractAddress,
        MOCK_DATA.to,
        MOCK_DATA.amount
      )
      const transferFrom = useERC20TransferFrom(
        MOCK_DATA.contractAddress,
        MOCK_DATA.from,
        MOCK_DATA.to,
        MOCK_DATA.amount
      )
      const approve = useERC20Approve(
        MOCK_DATA.contractAddress,
        MOCK_DATA.spender,
        MOCK_DATA.amount
      )

      expect(transfer).toEqual(mockContractWrite)
      expect(transferFrom).toEqual(mockContractWrite)
      expect(approve).toEqual(mockContractWrite)
    })

    it('should handle undefined contract address in all functions', () => {
      useERC20Transfer(undefined, MOCK_DATA.to, MOCK_DATA.amount)
      useERC20TransferFrom(undefined, MOCK_DATA.from, MOCK_DATA.to, MOCK_DATA.amount)
      useERC20Approve(undefined, MOCK_DATA.spender, MOCK_DATA.amount)

      expect(mockUseContractWrites).toHaveBeenCalledTimes(3)
    })
  })
})
