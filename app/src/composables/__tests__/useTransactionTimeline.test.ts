import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useTransactionTimeline } from '../useTransactionTimeline'
import type { TransactionTimelineParams } from '../useTransactionTimeline'
import type {
  UseSimulateContractReturnType,
  UseWaitForTransactionReceiptReturnType,
  UseWriteContractReturnType
} from '@wagmi/vue'

// Mock data constants
const MOCK_DATA = {
  validTxHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as const,
  blockNumber: 12345n,
  simulateResult: {
    result: { gas: 21000n },
    request: {}
  },
  receiptResult: {
    blockNumber: 12345n,
    status: 'success' as const,
    blockHash: '0x123',
    contractAddress: null,
    cumulativeGasUsed: 21000n,
    effectiveGasPrice: 1000000000n,
    from: '0xfrom',
    gasUsed: 21000n,
    logs: [],
    logsBloom: '0x',
    root: '0x',
    to: '0xto',
    transactionHash: '0xhash',
    transactionIndex: 0,
    type: 'legacy' as const,
    chainId: 1
  }
} as const

describe('useTransactionTimeline', () => {
  // Create individual reactive refs for mocking
  const mockWriteData = ref<unknown>(null)
  const mockWriteIsPending = ref(false)
  const mockWriteError = ref<unknown>(null)

  const mockReceiptData = ref<unknown>(null)
  const mockReceiptIsLoading = ref(false)
  const mockReceiptIsSuccess = ref(false)
  const mockReceiptError = ref<unknown>(null)

  const mockSimulateData = ref<unknown>(null)
  const mockSimulateIsLoading = ref(false)
  const mockSimulateError = ref<unknown>(null)

  const createMockParams = (): TransactionTimelineParams => ({
    writeResult: {
      data: mockWriteData,
      isPending: mockWriteIsPending,
      error: mockWriteError
    } as UseWriteContractReturnType,
    receiptResult: {
      data: mockReceiptData,
      isLoading: mockReceiptIsLoading,
      isSuccess: mockReceiptIsSuccess,
      error: mockReceiptError
    } as UseWaitForTransactionReceiptReturnType,
    simulateGasResult: {
      data: mockSimulateData,
      isLoading: mockSimulateIsLoading,
      error: mockSimulateError
    } as UseSimulateContractReturnType
  })

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset all mock refs
    mockWriteData.value = null
    mockWriteIsPending.value = false
    mockWriteError.value = null

    mockReceiptData.value = null
    mockReceiptIsLoading.value = false
    mockReceiptIsSuccess.value = false
    mockReceiptError.value = null

    mockSimulateData.value = null
    mockSimulateIsLoading.value = false
    mockSimulateError.value = null
  })

  describe('Initial State', () => {
    it('should return correct initial timeline steps', () => {
      const { timelineSteps, currentStep } = useTransactionTimeline(createMockParams())

      expect(currentStep.value).toBe(0)
      expect(timelineSteps.value.initiate.status).toBe('pending')
      expect(timelineSteps.value.pending.status).toBe('pending')
      expect(timelineSteps.value.confirming.status).toBe('pending')
      expect(timelineSteps.value.complete.status).toBe('pending')
      expect(timelineSteps.value.initiate.description).toBe('Preparing to verify transaction…')
    })

    it('should return all required properties', () => {
      const result = useTransactionTimeline(createMockParams())

      expect(result).toHaveProperty('currentStep')
      expect(result).toHaveProperty('timelineSteps')
      expect(result).toHaveProperty('prepareTransactionStatus')
      expect(result).toHaveProperty('approveTransactionStatus')
      expect(result).toHaveProperty('processingTransactionStatus')
      expect(result).toHaveProperty('transactionSummaryStatus')
    })
  })

  describe('Step 1: Prepare Transaction', () => {
    it('should show loading state when simulation is in progress', () => {
      mockSimulateIsLoading.value = true

      const { timelineSteps, currentStep, prepareTransactionStatus } =
        useTransactionTimeline(createMockParams())

      expect(prepareTransactionStatus.value).toBe('loading')
      expect(currentStep.value).toBe(0)
      expect(timelineSteps.value.initiate.status).toBe('active')
      expect(timelineSteps.value.initiate.description).toBe(
        'Verifying transaction details and estimating gas cost…'
      )
    })

    it('should show success state when simulation completes', () => {
      mockSimulateData.value = MOCK_DATA.simulateResult as unknown

      const { timelineSteps, prepareTransactionStatus } = useTransactionTimeline(createMockParams())

      expect(prepareTransactionStatus.value).toBe('success')
      expect(timelineSteps.value.initiate.status).toBe('completed')
      expect(timelineSteps.value.initiate.description).toBe(
        'Transaction verified successfully. Ready for approval.'
      )
    })

    it('should handle simulation errors', () => {
      mockSimulateError.value = new Error('execution reverted') as unknown

      const { timelineSteps, prepareTransactionStatus } = useTransactionTimeline(createMockParams())

      expect(prepareTransactionStatus.value).toBe('error')
      expect(timelineSteps.value.initiate.status).toBe('error')
      expect(timelineSteps.value.initiate.description).toBe(
        'Transaction simulation failed. The execution would revert.'
      )
    })
  })

  describe('Step 2: Approve Transaction', () => {
    it('should be ready when prepare succeeds', () => {
      mockSimulateData.value = MOCK_DATA.simulateResult

      const { timelineSteps, currentStep } = useTransactionTimeline(createMockParams())

      expect(currentStep.value).toBe(1)
      expect(timelineSteps.value.pending.description).toBe('Ready to approve in your wallet.')
    })

    it('should show loading state when write is pending', () => {
      mockSimulateData.value = MOCK_DATA.simulateResult
      mockWriteIsPending.value = true

      const { timelineSteps, approveTransactionStatus } = useTransactionTimeline(createMockParams())

      expect(approveTransactionStatus.value).toBe('loading')
      expect(timelineSteps.value.pending.status).toBe('active')
      expect(timelineSteps.value.pending.description).toBe(
        'Please confirm the transaction in your wallet.'
      )
    })

    it('should handle user rejection error', () => {
      mockSimulateData.value = MOCK_DATA.simulateResult
      mockWriteError.value = new Error('User rejected the request')

      const { timelineSteps } = useTransactionTimeline(createMockParams())

      expect(timelineSteps.value.pending.status).toBe('error')
      expect(timelineSteps.value.pending.description).toBe(
        'You declined the transaction. Nothing was sent.'
      )
    })
  })

  describe('Step 3: Processing Transaction', () => {
    it('should show loading state when receipt is loading', () => {
      mockSimulateData.value = MOCK_DATA.simulateResult
      mockWriteData.value = MOCK_DATA.validTxHash
      mockReceiptIsLoading.value = true

      const { timelineSteps, processingTransactionStatus } =
        useTransactionTimeline(createMockParams())

      expect(processingTransactionStatus.value).toBe('loading')
      expect(timelineSteps.value.confirming.status).toBe('active')
      expect(timelineSteps.value.confirming.description).toBe(
        'Your transaction has been sent to the network. Waiting for confirmation…'
      )
    })

    it('should show success state when receipt is received', () => {
      mockSimulateData.value = MOCK_DATA.simulateResult
      mockWriteData.value = MOCK_DATA.validTxHash
      mockReceiptIsSuccess.value = true
      mockReceiptData.value = MOCK_DATA.receiptResult

      const { timelineSteps, processingTransactionStatus } =
        useTransactionTimeline(createMockParams())

      expect(processingTransactionStatus.value).toBe('success')
      expect(timelineSteps.value.confirming.status).toBe('completed')
      expect(timelineSteps.value.confirming.description).toBe(
        `Transaction confirmed successfully in block ${MOCK_DATA.blockNumber}.`
      )
    })
  })

  describe('Transaction Summary', () => {
    it('should show success status when transaction completes', () => {
      mockSimulateData.value = MOCK_DATA.simulateResult
      mockWriteData.value = MOCK_DATA.validTxHash
      mockReceiptIsSuccess.value = true
      mockReceiptData.value = MOCK_DATA.receiptResult

      const { transactionSummaryStatus, timelineSteps } = useTransactionTimeline(createMockParams())

      expect(transactionSummaryStatus.value).toBe('success')
      expect(timelineSteps.value.complete.status).toBe('completed')
      expect(timelineSteps.value.complete.description).toContain('Your transaction was confirmed successfully')
    })

    it('should show idle status when transaction not yet complete', () => {
      mockSimulateData.value = MOCK_DATA.simulateResult
      mockWriteData.value = undefined
      mockReceiptIsSuccess.value = false

      const { transactionSummaryStatus, timelineSteps } = useTransactionTimeline(createMockParams())

      expect(transactionSummaryStatus.value).toBe('idle')
      expect(timelineSteps.value.complete.status).toBe('pending')
    })

    it('should show block number in description when available', () => {
      mockSimulateData.value = MOCK_DATA.simulateResult
      mockWriteData.value = MOCK_DATA.validTxHash
      mockReceiptIsSuccess.value = true
      mockReceiptData.value = MOCK_DATA.receiptResult

      const { timelineSteps } = useTransactionTimeline(createMockParams())

      expect(timelineSteps.value.confirming.description).toContain(`block ${MOCK_DATA.blockNumber}`)
    })
  })

  describe('Error Type Detection', () => {
    it('should detect user rejection errors', () => {
      mockWriteError.value = new Error('user rejected the request')
      mockSimulateData.value = MOCK_DATA.simulateResult

      const { timelineSteps } = useTransactionTimeline(createMockParams())

      expect(timelineSteps.value.pending.description).toBe(
        'You declined the transaction. Nothing was sent.'
      )
    })

    it('should detect insufficient funds errors', () => {
      mockSimulateError.value = new Error('insufficient funds for gas')

      const { timelineSteps } = useTransactionTimeline(createMockParams())

      expect(timelineSteps.value.initiate.description).toBe(
        "You don't have enough balance to perform this transaction."
      )
    })

    it('should detect revert errors', () => {
      mockSimulateError.value = new Error('execution reverted')

      const { timelineSteps } = useTransactionTimeline(createMockParams())

      expect(timelineSteps.value.initiate.description).toBe(
        'Transaction simulation failed. The execution would revert.'
      )
    })
  })

  describe('Timeline Steps Structure', () => {
    it('should return properly structured timeline steps', () => {
      const { timelineSteps } = useTransactionTimeline(createMockParams())
      const steps = timelineSteps.value

      expect(steps).toHaveProperty('initiate')
      expect(steps).toHaveProperty('pending')
      expect(steps).toHaveProperty('confirming')
      expect(steps).toHaveProperty('complete')

      Object.values(steps).forEach((step) => {
        expect(step).toHaveProperty('title')
        expect(step).toHaveProperty('description')
        expect(step).toHaveProperty('status')
        expect(['pending', 'active', 'completed', 'error']).toContain(step.status)
      })

      expect(steps.initiate.title).toBe('Prepare Transaction')
      expect(steps.pending.title).toBe('Approve Transaction')
      expect(steps.confirming.title).toBe('Processing Transaction')
      expect(steps.complete.title).toBe('Transaction Summary')
    })
  })

  describe('Status Mapping', () => {
    it('should map internal statuses to timeline statuses correctly', () => {
      const { timelineSteps } = useTransactionTimeline(createMockParams())

      // Test idle -> pending
      expect(timelineSteps.value.initiate.status).toBe('pending')

      // Test loading -> active
      mockSimulateIsLoading.value = true
      expect(timelineSteps.value.initiate.status).toBe('active')

      // Test success -> completed
      mockSimulateIsLoading.value = false
      mockSimulateData.value = MOCK_DATA.simulateResult
      expect(timelineSteps.value.initiate.status).toBe('completed')

      // Test error -> error
      mockSimulateData.value = null
      mockSimulateError.value = new Error('Test error')
      expect(timelineSteps.value.initiate.status).toBe('error')
    })
  })

  describe('Edge Cases', () => {
    it('should handle null error gracefully', () => {
      mockSimulateError.value = null

      const { timelineSteps } = useTransactionTimeline(createMockParams())

      expect(timelineSteps.value.initiate.description).toBe('Preparing to verify transaction…')
    })

    it('should handle empty error message gracefully', () => {
      mockSimulateError.value = new Error('')

      const { timelineSteps } = useTransactionTimeline(createMockParams())

      expect(timelineSteps.value.initiate.description).toBe(
        'Could not verify transaction. Please try again.'
      )
    })
  })
})
