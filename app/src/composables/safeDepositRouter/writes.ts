import { computed } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { SAFE_DEPOSIT_ROUTER_ABI } from '@/artifacts/abi/safe-deposit-router'
import { useContractWritesV3 } from '@/composables/contracts/useContractWritesV3'
import { useTeamStore } from '@/stores/teamStore'
import type { ExtractAbiFunctionNames } from 'abitype'

type SafeDepositRouterFunctionNames = ExtractAbiFunctionNames<typeof SAFE_DEPOSIT_ROUTER_ABI>

function useSafeDepositRouterContractWrite(functionName: SafeDepositRouterFunctionNames) {
  const teamStore = useTeamStore()
  const contractAddress = computed(() => teamStore.getContractAddressByType('SafeDepositRouter'))
  return useContractWritesV3({
    contractAddress,
    abi: SAFE_DEPOSIT_ROUTER_ABI,
    functionName
  })
}

export function useEnableDeposits() {
  return useSafeDepositRouterContractWrite('enableDeposits')
}

export function useDisableDeposits() {
  return useSafeDepositRouterContractWrite('disableDeposits')
}

export function useRenounceOwnership() {
  return useSafeDepositRouterContractWrite('renounceOwnership')
}

export function useTransferOwnership() {
  return useSafeDepositRouterContractWrite('transferOwnership')
}

export function useSetSafeAddress() {
  return useSafeDepositRouterContractWrite('setSafeAddress')
}

export function useSetMultiplier() {
  return useSafeDepositRouterContractWrite('setMultiplier')
}

export function useAddTokenSupport() {
  return useSafeDepositRouterContractWrite('addTokenSupport')
}

export function useRemoveTokenSupport() {
  return useSafeDepositRouterContractWrite('removeTokenSupport')
}

/**
 * `deposit` mints SHER, so reads on InvestorV1 must also be invalidated.
 * The router's own reads are flushed by `useContractWritesV3`.
 */
export function useDeposit() {
  const queryClient = useQueryClient()
  const teamStore = useTeamStore()
  const contractAddress = computed(() => teamStore.getContractAddressByType('SafeDepositRouter'))

  return useContractWritesV3({
    contractAddress,
    abi: SAFE_DEPOSIT_ROUTER_ABI,
    functionName: 'deposit',
    onSuccess: async () => {
      const investor = teamStore.getContractAddressByType('InvestorV1')
      if (!investor) return
      const investorLower = investor.toLowerCase()
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey
          if (!Array.isArray(key) || key[0] !== 'readContract') return false
          const params = key[1] as { address?: string } | undefined
          return (
            typeof params?.address === 'string' && params.address.toLowerCase() === investorLower
          )
        }
      })
    }
  })
}
