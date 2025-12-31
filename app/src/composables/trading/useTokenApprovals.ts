// composables/useTokenApprovals.ts
import { ref } from 'vue'
import type { RelayClient } from '@polymarket/builder-relayer-client'
import {
  checkAllApprovals,
  createAllApprovalTxs,
  createCompleteSetupTransactions,
  type ApprovalCheckResult
} from '@/utils/trading/approvalsUtil'

export const useTokenApprovals = () => {
  // Reactive state
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const approvalStatus = ref<ApprovalCheckResult | null>(null)

  /**
   * Check all required approvals including safe owners
   */
  const checkAllApprovalsWithOwners = async (safeAddress: string): Promise<ApprovalCheckResult> => {
    isLoading.value = true
    error.value = null

    try {
      const result = await checkAllApprovals(safeAddress)
      approvalStatus.value = result
      isLoading.value = false
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to check approvals and owners'
      error.value = errorMsg
      isLoading.value = false
      throw err instanceof Error ? err : new Error(errorMsg)
    }
  }

  /**
   * Set all token approvals using relay client
   */
  const setAllTokenApprovals = async (relayClient: RelayClient): Promise<boolean> => {
    isLoading.value = true
    error.value = null

    try {
      const approvalTxs = createAllApprovalTxs()
      const response = await relayClient.execute(approvalTxs, 'Set all token approvals for trading')
      await response.wait()

      approvalStatus.value = null
      isLoading.value = false
      return true
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to set all token approvals'
      error.value = errorMsg
      isLoading.value = false
      console.error('Failed to set all token approvals:', err)
      return false
    }
  }

  /**
   * Complete setup: approvals + add owners
   */
  const completeSetup = async (relayClient: RelayClient, safeAddress: string): Promise<boolean> => {
    isLoading.value = true
    error.value = null

    try {
      const setupTxs = createCompleteSetupTransactions(safeAddress)
      const response = await relayClient.execute(
        setupTxs,
        'Complete trading setup: approvals and owners'
      )
      await response.wait()

      approvalStatus.value = null
      isLoading.value = false
      return true
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to complete setup'
      error.value = errorMsg
      isLoading.value = false
      console.error('Failed to complete setup:', err)
      return false
    }
  }

  /**
   * Reset the composable state
   */
  const reset = () => {
    isLoading.value = false
    error.value = null
    approvalStatus.value = null
  }

  return {
    // State
    isLoading,
    error,
    approvalStatus,

    // Methods
    checkAllApprovals: checkAllApprovalsWithOwners,
    setAllTokenApprovals,
    completeSetup,
    reset
  }
}
