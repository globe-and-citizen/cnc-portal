import { computed } from 'vue'
import type { TimelineSteps } from '@/components/ui/TransactionTimeline.vue'
import type {
  UseSimulateContractReturnType,
  UseWaitForTransactionReceiptReturnType,
  UseWriteContractReturnType
} from '@wagmi/vue'

// TODO: need improvement: Steps can be improved, message error also
export interface TransactionTimelineParams {
  writeResult: UseWriteContractReturnType
  receiptResult: UseWaitForTransactionReceiptReturnType
  simulateGasResult: UseSimulateContractReturnType
}

export function useTransactionTimeline(params: TransactionTimelineParams) {
  const { writeResult, receiptResult, simulateGasResult } = params

  const getEstimatingGasStatus = computed(() => {
    if (simulateGasResult.isLoading.value) {
      return 'active'
    } else if (simulateGasResult.error.value) {
      return 'error'
    } else if (simulateGasResult.data.value) {
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
      return `Gas estimated: ${simulateGasResult.data.value}`
    } else {
      return 'Gas estimation pending'
    }
  })

  const getApprovalStatus = computed(() => {
    if (writeResult.isPending.value) {
      return 'active'
    } else if (writeResult.error.value) {
      return 'error'
    } else if (writeResult.data.value) {
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
    if (receiptResult.isLoading.value) {
      return 'active'
    } else if (receiptResult.isSuccess.value) {
      return 'completed'
    } else if (receiptResult.error.value) {
      return 'error'
    } else {
      return 'pending'
    }
  })

  const getTransactionReceiptMessage = computed(() => {
    if (getTransactionReceiptStatus.value === 'active') {
      return 'Transaction is being confirmed...'
    } else if (getTransactionReceiptStatus.value === 'completed') {
      return `Transaction confirmed in block ${receiptResult.data.value?.blockNumber}`
    } else if (getTransactionReceiptStatus.value === 'error') {
      return 'Error during transaction confirmation'
    } else {
      return 'Awaiting transaction confirmation'
    }
  })

  const currentStep = computed(() => {
    if (!writeResult.isPending.value && !simulateGasResult.isLoading.value) {
      return 0
    } else if (writeResult.isPending.value || writeResult.error.value) {
      return 1
    } else if (receiptResult.isLoading.value) {
      return 2
    } else if (receiptResult.isSuccess.value) {
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
        status: receiptResult.data.value ? 'completed' : 'pending'
      }
    }
  })

  return {
    currentStep,

    // Main timeline steps for direct use with TransactionTimeline component
    timelineSteps
  }
}
