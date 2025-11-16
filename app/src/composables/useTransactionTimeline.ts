import { computed } from 'vue'
import type { TimelineSteps } from '@/components/ui/TransactionTimeline.vue'
import type {
  UseSimulateContractReturnType,
  UseWaitForTransactionReceiptReturnType,
  UseWriteContractReturnType
} from '@wagmi/vue'
import { parseErrorV2 } from '@/utils/errorUtil'

export type TimelineStepStatus = 'idle' | 'loading' | 'success' | 'error'

export interface TransactionTimelineParams {
  writeResult: UseWriteContractReturnType
  receiptResult: UseWaitForTransactionReceiptReturnType
  simulateGasResult: UseSimulateContractReturnType
}

export function useTransactionTimeline(params: TransactionTimelineParams) {
  const { writeResult, receiptResult, simulateGasResult } = params

  // Helper function to map our internal status to timeline component status
  const mapToTimelineStatus = (
    status: TimelineStepStatus
  ): 'pending' | 'active' | 'completed' | 'error' => {
    switch (status) {
      case 'idle':
        return 'pending'
      case 'loading':
        return 'active'
      case 'success':
        return 'completed'
      case 'error':
        return 'error'
      default:
        return 'pending'
    }
  }

  // Helper function to detect error types
  const getErrorType = (error: Error | null): string => {
    if (!error) return 'none'

    const message = error.message.toLowerCase()

    // User rejection patterns
    if (
      message.includes('user rejected') ||
      message.includes('user denied') ||
      message.includes('cancelled') ||
      message.includes('user cancelled')
    ) {
      return 'user_rejected'
    }

    // Insufficient funds patterns
    if (
      message.includes('insufficient funds') ||
      message.includes('insufficient balance') ||
      message.includes('not enough') ||
      message.includes('exceeds balance')
    ) {
      return 'funds'
    }

    // Revert/execution patterns
    if (
      message.includes('revert') ||
      message.includes('execution reverted') ||
      message.includes('transaction reverted')
    ) {
      return 'revert'
    }

    // Transaction dropped patterns
    if (message.includes('dropped') || message.includes('replaced') || message.includes('nonce')) {
      return 'dropped'
    }

    return 'generic'
  }

  // Step 1: Prepare Transaction Status & Description
  const prepareTransactionStatus = computed((): TimelineStepStatus => {
    if (simulateGasResult.isLoading.value) return 'loading'
    if (simulateGasResult.error.value) return 'error'
    if (simulateGasResult.isSuccess.value === true) return 'success'
    return 'idle'
  })

  const prepareTransactionDescription = computed(() => {
    const status = prepareTransactionStatus.value

    switch (status) {
      case 'idle':
        return 'Preparing to verify transaction…'
      case 'loading':
        return 'Verifying transaction details and estimating gas cost…'
      case 'success':
        return 'Transaction verified successfully. Ready for approval.'
      case 'error':
        // return the first sentence of the error message
        return parseErrorV2(
          simulateGasResult.error.value ?? new Error('Unknown error during simulation')
        )

      // switch (errorType) {
      //   case 'revert':
      //     return 'Transaction simulation failed. The execution would revert.'
      //   case 'funds':
      //     return "You don't have enough balance to perform this transaction."
      //   default:
      //     return 'Could not verify transaction. Please try again.'
      // }
      default:
        return 'Preparing to verify transaction…'
    }
  })

  // Step 2: Approve Transaction Status & Description
  const approveTransactionStatus = computed((): TimelineStepStatus => {
    if (writeResult.isPending.value) return 'loading'
    if (writeResult.error.value) return 'error'
    if (writeResult.data.value) return 'success'
    return 'idle'
  })

  const approveTransactionDescription = computed(() => {
    const status = approveTransactionStatus.value
    const prepareStatus = prepareTransactionStatus.value

    switch (status) {
      case 'idle':
        if (prepareStatus === 'loading') {
          return 'Waiting for simulation result…'
        } else if (prepareStatus === 'success') {
          return 'Ready to approve in your wallet.'
        } else if (prepareStatus === 'error') {
          return 'Cannot approve because the simulation failed.'
        }
        return 'Waiting for simulation result…'
      case 'loading':
        return 'Please confirm the transaction in your wallet.'
      case 'success':
        return 'Transaction approved successfully.'
      case 'error':
        if (prepareStatus === 'error') {
          return "You can't approve because the simulation failed."
        }
        const errorType = getErrorType(writeResult.error.value)
        if (errorType === 'user_rejected') {
          return 'You declined the transaction. Nothing was sent.'
        }
        return 'Transaction approval failed. Please try again.'
      default:
        return 'Ready to approve in your wallet.'
    }
  })

  // Step 3: Processing Transaction Status & Description
  const processingTransactionStatus = computed((): TimelineStepStatus => {
    if (receiptResult.isLoading.value) return 'loading'
    if (receiptResult.isSuccess.value) return 'success'
    if (receiptResult.error.value) return 'error'
    return 'idle'
  })

  const processingTransactionDescription = computed(() => {
    const status = processingTransactionStatus.value
    const approveStatus = approveTransactionStatus.value

    switch (status) {
      case 'idle':
        if (approveStatus === 'success') {
          return 'Preparing to send transaction to the network…'
        } else {
          return "Cannot process because the transaction wasn't approved."
        }
      case 'loading':
        // Check if transaction has been pending for a long time (this would need additional logic)
        return 'Your transaction has been sent to the network. Waiting for confirmation…'
      case 'success':
        const blockNumber = receiptResult.data.value?.blockNumber
        return blockNumber
          ? `Transaction confirmed successfully in block ${blockNumber}.`
          : 'Transaction confirmed successfully on the blockchain.'
      case 'error':
        if (approveStatus !== 'success') {
          return 'Cannot process transaction — it was never approved.'
        }
        const errorType = getErrorType(receiptResult.error.value)
        switch (errorType) {
          case 'revert':
            return 'Transaction failed during execution. It was reverted by the network.'
          case 'dropped':
            return 'Transaction was dropped or replaced. Please check your wallet activity.'
          default:
            return 'Transaction failed during processing. Please try again.'
        }
      default:
        return 'Preparing to send transaction to the network…'
    }
  })

  // Step 4: Transaction Summary Status & Description
  const transactionSummaryStatus = computed((): TimelineStepStatus => {
    const prepareStatus = prepareTransactionStatus.value
    const approveStatus = approveTransactionStatus.value
    const processingStatus = processingTransactionStatus.value

    // Success only if all previous steps succeeded
    if (
      prepareStatus === 'success' &&
      approveStatus === 'success' &&
      processingStatus === 'success'
    ) {
      return 'success'
    }

    // Error if any step failed
    if (processingStatus === 'error') {
      return 'error'
    }

    // Loading if any step is in progress
    if (processingStatus === 'loading') {
      return 'loading'
    }

    return 'idle'
  })

  const transactionSummaryDescription = computed(() => {
    const prepareStatus = prepareTransactionStatus.value
    const approveStatus = approveTransactionStatus.value
    const processingStatus = processingTransactionStatus.value
    const summaryStatus = transactionSummaryStatus.value

    if (summaryStatus === 'success') {
      const txHash = writeResult.data.value
      const blockNumber = receiptResult.data.value?.blockNumber

      let message = 'Your transaction was confirmed successfully.'
      if (txHash && blockNumber) {
        message += ` Transaction hash: ${txHash.slice(0, 10)}...${txHash.slice(-8)}`
      }
      return message
    }

    // Determine which step failed first
    if (prepareStatus === 'error') {
      const errorType = getErrorType(simulateGasResult.error.value)
      if (errorType === 'funds') {
        return "The transaction couldn't start due to insufficient balance."
      }
      return "The transaction couldn't start due to a simulation error."
    }

    if (approveStatus === 'error') {
      const errorType = getErrorType(writeResult.error.value)
      if (errorType === 'user_rejected') {
        return 'You declined the transaction. Nothing was sent to the blockchain.'
      }
      return 'Transaction approval failed. Please try again.'
    }

    if (processingStatus === 'error') {
      return 'Transaction failed during execution on the blockchain.'
    }

    // Still in progress
    if (summaryStatus === 'loading') {
      return 'Processing your transaction...'
    }

    return 'Ready to begin transaction process.'
  })

  // Determine current active step
  const currentStep = computed(() => {
    const prepareStatus = prepareTransactionStatus.value
    const approveStatus = approveTransactionStatus.value
    const processingStatus = processingTransactionStatus.value

    if (prepareStatus === 'loading' || prepareStatus === 'idle') {
      return 0
    } else if (prepareStatus === 'error') {
      return 0 // Stay on step 0 if prepare fails
    } else if (
      approveStatus === 'loading' ||
      (prepareStatus === 'success' && approveStatus === 'idle')
    ) {
      return 1
    } else if (approveStatus === 'error') {
      return 1 // Stay on step 1 if approve fails
    } else if (
      processingStatus === 'loading' ||
      (approveStatus === 'success' && processingStatus === 'idle')
    ) {
      return 2
    } else if (processingStatus === 'error') {
      return 2 // Stay on step 2 if processing fails
    } else if (processingStatus === 'success') {
      return 3
    }

    return 0
  })

  const timelineSteps = computed((): TimelineSteps => {
    return {
      initiate: {
        title: 'Prepare Transaction',
        description: prepareTransactionDescription.value,
        status: mapToTimelineStatus(prepareTransactionStatus.value)
      },
      pending: {
        title: 'Approve Transaction',
        description: approveTransactionDescription.value,
        status: mapToTimelineStatus(approveTransactionStatus.value)
      },
      confirming: {
        title: 'Processing Transaction',
        description: processingTransactionDescription.value,
        status: mapToTimelineStatus(processingTransactionStatus.value)
      },
      complete: {
        title: 'Transaction Summary',
        description: transactionSummaryDescription.value,
        status: mapToTimelineStatus(transactionSummaryStatus.value)
      }
    }
  })

  return {
    currentStep,
    timelineSteps,

    // Individual step statuses for external use if needed
    prepareTransactionStatus,
    approveTransactionStatus,
    processingTransactionStatus,
    transactionSummaryStatus
  }
}
