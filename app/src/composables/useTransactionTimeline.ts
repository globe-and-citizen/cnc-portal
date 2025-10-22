import { computed, type Ref } from 'vue'
import type { TimelineSteps } from '@/components/ui/TransactionTimeline.vue'

// TODO: need improvement: Steps can be improved, message error also
export interface TransactionTimelineParams {
  isEstimatingGas: Ref<boolean>
  gasEstimateError: Ref<Error | null | undefined>
  gasEstimate: Ref<bigint | undefined>
  isWritePending: Ref<boolean>
  error: Ref<Error | null | undefined>
  writeContractData: Ref<unknown>
  isConfirming: Ref<boolean>
  isConfirmed: Ref<boolean>
  receipt: Ref<{ blockNumber?: bigint | number } | null | undefined>
}

export function useTransactionTimeline(params: TransactionTimelineParams) {
  const {
    isEstimatingGas,
    gasEstimateError,
    gasEstimate,
    isWritePending,
    error,
    writeContractData,
    isConfirming,
    isConfirmed,
    receipt
  } = params

  const getEstimatingGasStatus = computed(() => {
    if (isEstimatingGas.value) {
      return 'active'
    } else if (gasEstimateError.value) {
      return 'error'
    } else if (gasEstimate.value) {
      return 'completed'
    } else {
      return 'pending'
    }
  })

  const getEstimatingGasMessage = computed(() => {
    if (getEstimatingGasStatus.value === 'active') {
      return 'Estimating gas...'
    } else if (getEstimatingGasStatus.value === 'error') {
      return 'Error estimating gas'
    } else if (getEstimatingGasStatus.value === 'completed') {
      return `Gas estimated: ${gasEstimate.value}`
    } else {
      return 'Gas estimation pending'
    }
  })

  const getApprovalStatus = computed(() => {
    if (isWritePending.value) {
      return 'active'
    } else if (error.value) {
      return 'error'
    } else if (writeContractData.value) {
      return 'completed'
    } else {
      return 'pending'
    }
  })

  const getApprovalMessage = computed(() => {
    if (getApprovalStatus.value === 'active') {
      return 'Waiting for user approval...'
    } else if (getApprovalStatus.value === 'error') {
      return 'Error during approval'
    } else if (getApprovalStatus.value === 'completed') {
      return 'Transaction approved'
    } else {
      return 'Awaiting approval'
    }
  })

  const getTransactionReceiptStatus = computed(() => {
    if (isConfirming.value) {
      return 'active'
    } else if (isConfirmed.value) {
      return 'completed'
    } else if (error.value) {
      return 'error'
    } else {
      return 'pending'
    }
  })

  const getTransactionReceiptMessage = computed(() => {
    if (getTransactionReceiptStatus.value === 'active') {
      return 'Transaction is being confirmed...'
    } else if (getTransactionReceiptStatus.value === 'completed') {
      return `Transaction confirmed in block ${receipt.value?.blockNumber}`
    } else if (getTransactionReceiptStatus.value === 'error') {
      return 'Error during transaction confirmation'
    } else {
      return 'Awaiting transaction confirmation'
    }
  })

  const currentStep = computed(() => {
    if (!isWritePending.value && !isEstimatingGas.value) {
      return 0
    } else if (isWritePending.value || error.value) {
      return 1
    } else if (isConfirming.value) {
      return 2
    } else if (isConfirmed.value) {
      return 3
    } else {
      return 0
    }
  })

  const timelineSteps = computed((): TimelineSteps => {
    return {
      initiate: {
        title: 'Prepare Transaction',
        description: getEstimatingGasMessage.value,
        status: getEstimatingGasStatus.value
      },
      pending: {
        title: 'Approve Transaction',
        description: getApprovalMessage.value,
        status: getApprovalStatus.value
      },
      confirming: {
        title: 'Execute Transaction',
        description: getTransactionReceiptMessage.value,
        status: getTransactionReceiptStatus.value
      },
      complete: {
        title: 'Confirm Transaction',
        description: 'The operation has been successful',
        status: receipt.value ? 'completed' : 'pending'
      }
    }
  })

  return {
    // Individual status and message getters (for advanced usage)
    // getEstimatingGasStatus,
    // getEstimatingGasMessage,
    // getApprovalStatus,
    // getApprovalMessage,
    // getTransactionReceiptStatus,
    // getTransactionReceiptMessage,
    currentStep,

    // Main timeline steps for direct use with TransactionTimeline component
    timelineSteps
  }
}