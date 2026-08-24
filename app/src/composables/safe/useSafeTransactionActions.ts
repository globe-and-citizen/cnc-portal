import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue'
import { useChainId } from '@wagmi/vue'
import type { Address } from 'viem'
import type { SafeTransaction } from '@/types/safe'
import {
  useApproveTransactionMutation,
  useExecuteTransactionMutation
} from '@/queries/safe.mutations'
import { log } from '@/utils'

interface UseSafeTransactionActionsParams {
  safeAddress: MaybeRefOrGetter<Address | undefined>
  willApprovalCauseConflict: (transaction: SafeTransaction) => boolean
  hasConflictingTransactions: (transaction: SafeTransaction) => boolean
}

type ActionType = 'approve' | 'execute'

/** The confirmation a signer must make before continuing with a conflicting transaction. */
export interface SafeTransactionConflictWarning {
  action: ActionType
}

export function useSafeTransactionActions({
  safeAddress,
  willApprovalCauseConflict,
  hasConflictingTransactions
}: UseSafeTransactionActionsParams) {
  const toast = useToast()
  const chainId = useChainId()
  const { mutate: approve, isPending: isApproving } = useApproveTransactionMutation()
  const { mutate: execute, isPending: isExecuting } = useExecuteTransactionMutation()

  const pendingExecutionTransaction = ref<SafeTransaction | null>(null)
  const pendingApprovalTransaction = ref<SafeTransaction | null>(null)
  const pendingConflictAction = ref<ActionType | null>(null)
  const approvingTransactions = ref<Set<string>>(new Set())
  const executingTransactions = ref<Set<string>>(new Set())

  const conflictWarning = computed<SafeTransactionConflictWarning | null>(() =>
    pendingConflictAction.value ? { action: pendingConflictAction.value } : null
  )

  const isTransactionLoading = (safeTxHash: string, operation: ActionType): boolean => {
    if (operation === 'approve') {
      return approvingTransactions.value.has(safeTxHash) && isApproving.value
    }

    return executingTransactions.value.has(safeTxHash) && isExecuting.value
  }

  const getTransactionErrorMessage = (error: unknown, fallback: string): string => {
    const message = error instanceof Error ? error.message : fallback
    return message.includes('User rejected') ? 'Transaction rejected' : message
  }

  const handleApproveTransaction = (transaction: SafeTransaction) => {
    const resolvedSafeAddress = toValue(safeAddress)
    if (!resolvedSafeAddress) return

    approvingTransactions.value.add(transaction.safeTxHash)
    approve(
      {
        pathParams: {
          safeAddress: resolvedSafeAddress,
          safeTxHash: transaction.safeTxHash
        },
        queryParams: {
          chainId: chainId.value
        }
      },
      {
        onSuccess: () => {
          toast.add({
            title: 'Success',
            description: 'Transaction approved successfully',
            color: 'success'
          })
        },
        onError: (error) => {
          log.error('Failed to approve transaction:', error)
          toast.add({
            title: 'Error',
            description: getTransactionErrorMessage(error, 'Failed to approve transaction'),
            color: 'error'
          })
        },
        onSettled: () => {
          approvingTransactions.value.delete(transaction.safeTxHash)
        }
      }
    )
  }

  const handleExecuteTransaction = (transaction: SafeTransaction) => {
    const resolvedSafeAddress = toValue(safeAddress)
    if (!resolvedSafeAddress) return

    executingTransactions.value.add(transaction.safeTxHash)
    execute(
      {
        pathParams: {
          safeAddress: resolvedSafeAddress,
          safeTxHash: transaction.safeTxHash
        },
        queryParams: {
          chainId: chainId.value
        },
        body: {
          transactionData: transaction
        }
      },
      {
        onSuccess: () => {
          toast.add({
            title: 'Success',
            description: 'Transaction executed successfully',
            color: 'success'
          })
        },
        onError: (error) => {
          log.error('Failed to execute transaction:', error)
          toast.add({
            title: 'Error',
            description: getTransactionErrorMessage(error, 'Failed to execute transaction'),
            color: 'error'
          })
        },
        onSettled: () => {
          executingTransactions.value.delete(transaction.safeTxHash)
        }
      }
    )
  }

  const handleApproveClick = (transaction: SafeTransaction) => {
    if (willApprovalCauseConflict(transaction)) {
      pendingApprovalTransaction.value = transaction
      pendingConflictAction.value = 'approve'
      return
    }

    handleApproveTransaction(transaction)
  }

  const handleExecuteClick = (transaction: SafeTransaction) => {
    if (hasConflictingTransactions(transaction)) {
      pendingExecutionTransaction.value = transaction
      pendingConflictAction.value = 'execute'
      return
    }

    handleExecuteTransaction(transaction)
  }

  const handleConfirmAction = () => {
    if (pendingConflictAction.value === 'approve' && pendingApprovalTransaction.value) {
      handleApproveTransaction(pendingApprovalTransaction.value)
      pendingApprovalTransaction.value = null
    } else if (pendingConflictAction.value === 'execute' && pendingExecutionTransaction.value) {
      handleExecuteTransaction(pendingExecutionTransaction.value)
      pendingExecutionTransaction.value = null
    }
    pendingConflictAction.value = null
  }

  const handleCancelAction = () => {
    pendingExecutionTransaction.value = null
    pendingApprovalTransaction.value = null
    pendingConflictAction.value = null
  }

  return {
    isApproving,
    isExecuting,
    conflictWarning,
    isTransactionLoading,
    handleApproveClick,
    handleExecuteClick,
    handleConfirmAction,
    handleCancelAction
  }
}
