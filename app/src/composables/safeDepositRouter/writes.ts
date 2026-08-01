import { computed } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { safeDepositRouterAbi } from '@/artifacts/abi/generated'
import {
  useContractWritesV3,
  type WriteFunctionName
} from '@/composables/contracts/useContractWritesV3'
import { useTeamStore } from '@/stores/teamStore'

type SafeDepositRouterFunctionNames = WriteFunctionName<typeof safeDepositRouterAbi>

function useSafeDepositRouterContractWrite<F extends SafeDepositRouterFunctionNames>(
  functionName: F
) {
  const teamStore = useTeamStore()
  const contractAddress = computed(() => teamStore.getContractAddressByType('SafeDepositRouter'))
  return useContractWritesV3({
    contractAddress,
    abi: safeDepositRouterAbi,
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
 * `deposit` mints SHER, so reads on the Investor share token must also be
 * invalidated.
 * The router's own reads are flushed by `useContractWritesV3`.
 */
export function useDeposit() {
  const queryClient = useQueryClient()
  const teamStore = useTeamStore()
  const contractAddress = computed(() => teamStore.getContractAddressByType('SafeDepositRouter'))

  return useContractWritesV3({
    contractAddress,
    abi: safeDepositRouterAbi,
    functionName: 'deposit',
    onSuccess: async () => {
      const investor = teamStore.getInvestorAddress()
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
