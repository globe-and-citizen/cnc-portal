import { computed, type MaybeRef } from 'vue'
import type { SafeTransaction } from '@/types/safe'
import { useSafeTransactionsQuery, useSafeInfoQuery } from '@/queries/safe.queries'

export interface TransactionConflictInfo {
  hasConflicts: boolean
  conflictingTransactionsCount: number
  currentNonce: number
  invalidTransactions: SafeTransaction[]
}

/**
 * Detect transaction conflicts in Safe operations
 * Helps identify when executing/approving a transaction would invalidate others
 *
 * @param safeAddress - The Safe wallet address to check conflicts for
 */
export function useSafeTransactionConflicts(safeAddress: MaybeRef<string | undefined>) {
  // Fetch Safe info and transactions internally
  const { data: safeInfo } = useSafeInfoQuery(safeAddress)
  const { data: transactions } = useSafeTransactionsQuery(safeAddress)

  const currentSafeNonce = computed(() => safeInfo.value?.nonce ?? 0)

  /**
   * Check if transaction nonce is valid (can still be executed)
   * Per Safe Protocol: transactions must be executed in sequential nonce order
   * Any transaction with nonce < current Safe nonce is permanently invalid
   */
  const isTransactionNonceValid = (transaction: SafeTransaction): boolean => {
    return transaction.nonce >= currentSafeNonce.value
  }

  /**
   * Get all pending (non-executed) transactions with valid nonces
   */
  const pendingValidTransactions = computed(() => {
    if (!transactions.value) return []

    return transactions.value.filter((tx) => !tx.isExecuted && tx.nonce >= currentSafeNonce.value)
  })

  /**
   * Check if there are multiple pending valid transactions
   * This indicates potential conflicts if any of them is executed
   */
  const hasPendingTransactions = computed(() => {
    return pendingValidTransactions.value.length > 0
  })

  /**
   * Check if executing/approving this specific transaction would conflict with others
   * Returns true if there are other pending valid transactions
   */
  const hasConflictingTransactions = (transaction: SafeTransaction): boolean => {
    if (!transactions.value) return false

    // Check if there are any other pending transactions with valid nonces
    return transactions.value.some(
      (tx) =>
        !tx.isExecuted &&
        tx.safeTxHash !== transaction.safeTxHash &&
        tx.nonce >= currentSafeNonce.value
    )
  }

  /**
   * Count how many transactions would be affected/invalidated
   * if this transaction is executed
   */
  const getConflictingTransactionsCount = (transaction: SafeTransaction): number => {
    if (!transactions.value) return 0

    // Count pending transactions with nonce >= current Safe nonce
    // (excluding the transaction being executed)
    return transactions.value.filter(
      (tx) =>
        !tx.isExecuted &&
        tx.safeTxHash !== transaction.safeTxHash &&
        tx.nonce >= currentSafeNonce.value
    ).length
  }

  /**
   * Check if approving this transaction could lead to conflicts
   * This checks if the transaction, once approved and potentially executed,
   * would invalidate other pending transactions
   */
  const willApprovalCauseConflict = (transaction: SafeTransaction): boolean => {
    if (!transactions.value) return false

    // Get confirmations count after this approval would be added
    const currentConfirmations = transaction.confirmations?.length || 0
    const confirmationsAfterApproval = currentConfirmations + 1
    const requiredConfirmations =
      transaction.confirmationsRequired || safeInfo.value?.threshold || 0

    // If this approval would reach threshold, check for conflicts
    // (transaction would be ready to execute)
    const wouldReachThreshold = confirmationsAfterApproval >= requiredConfirmations

    if (wouldReachThreshold) {
      return hasConflictingTransactions(transaction)
    }

    return false
  }

  /**
   * Get detailed conflict information for a transaction
   */
  const getConflictInfo = (transaction: SafeTransaction): TransactionConflictInfo => {
    return {
      hasConflicts: hasConflictingTransactions(transaction),
      conflictingTransactionsCount: getConflictingTransactionsCount(transaction),
      currentNonce: currentSafeNonce.value,
      invalidTransactions: transactions.value?.filter((tx) => !isTransactionNonceValid(tx)) || []
    }
  }

  return {
    currentSafeNonce,
    isTransactionNonceValid,
    pendingValidTransactions,
    hasPendingTransactions,
    hasConflictingTransactions,
    getConflictingTransactionsCount,
    willApprovalCauseConflict,
    getConflictInfo
  }
}
