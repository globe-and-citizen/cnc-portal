// composables/useTokenApprovals.ts
import { computed, ref } from 'vue'
import type { RelayClient } from '@polymarket/builder-relayer-client'
import {
  checkAllApprovals,
  createAllApprovalTxs,
  createCompleteSetupTransactions,
  type ApprovalCheckResult
} from '@/utils/trading/approvalsUtil'
import { useTeamStore } from '@/stores'
import { getAddress } from 'viem'

export const useTokenApprovals = () => {
  // Reactive state
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const approvalStatus = ref<ApprovalCheckResult | null>(null)
  const teamStore = useTeamStore()

  const systemOwners = computed(() => {
    const teamData = teamStore.currentTeamMeta.data
    const bankSafe = teamData?.safeAddress ? getAddress(teamData?.safeAddress) : undefined
    const ownerAddress = teamData?.ownerAddress ? getAddress(teamData?.ownerAddress) : undefined
    return !bankSafe || !ownerAddress ? [] : [bankSafe, ownerAddress]
  })

  /**
   * Check all required approvals including safe owners
   */
  const checkAllApprovalsWithOwners = async (safeAddress: string): Promise<ApprovalCheckResult> => {
    isLoading.value = true
    error.value = null

    try {
      if (systemOwners.value.length === 0) throw new Error('No system owners set')
      const result = await checkAllApprovals(safeAddress, systemOwners.value as `0x${string}`[])
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
  const completeSetup = async (
    relayClient: RelayClient,
    safeAddress: string,
    missingOwners: `0x${string}`[]
  ): Promise<boolean> => {
    isLoading.value = true
    error.value = null

    try {
      if (systemOwners.value.length === 0) throw new Error('No system owners set')
      const setupTxs = createCompleteSetupTransactions(safeAddress, missingOwners)
      const response = await relayClient.execute(
        setupTxs,
        'Complete trading setup: approvals and owners'
      )
      const result = await response.wait()

      if (!result) {
        // Action was successful
        throw new Error('Failed to complete setup transactions')
      }

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
