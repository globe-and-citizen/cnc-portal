import { computed } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { SAFE_DEPOSIT_ROUTER_ABI } from '@/artifacts/abi/safe-deposit-router'
import {
  useContractWritesV3,
  executeContractWrite
} from '@/composables/contracts/useContractWritesV3'
import { useTeamStore } from '@/stores/teamStore'
import { log, parseErrorV2 } from '@/utils'
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
 * Deposit on SafeDepositRouter.
 *
 * Goes through `useMutation + executeContractWrite` (rather than the thin
 * `useContractWritesV3` wrapper) so the success path can flush both the router
 * reads *and* the InvestorV1 reads — depositing mints SHER, so balances /
 * total supply on InvestorV1 also need to refetch. Cross-contract invalidation
 * lives in the composable, not in every consumer.
 */
export function useDeposit() {
  const queryClient = useQueryClient()
  const teamStore = useTeamStore()

  return useMutation({
    mutationFn: async (variables: { args?: readonly unknown[]; value?: bigint } = {}) => {
      const address = teamStore.getContractAddressByType('SafeDepositRouter')
      if (!address) throw new Error('SafeDepositRouter address is undefined')
      return executeContractWrite({
        address,
        abi: SAFE_DEPOSIT_ROUTER_ABI,
        functionName: 'deposit',
        args: variables.args,
        value: variables.value
      })
    },
    onSuccess: async () => {
      const routerAddress = teamStore.getContractAddressByType('SafeDepositRouter')
      const investorAddress = teamStore.getContractAddressByType('InvestorV1')
      const invalidations: Promise<unknown>[] = []
      if (routerAddress) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: ['readContract', { address: routerAddress }]
          })
        )
      }
      if (investorAddress) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: ['readContract', { address: investorAddress }]
          })
        )
      }
      await Promise.all(invalidations)
    },
    onError: (error) => {
      log.error('useDeposit failed:\n', parseErrorV2(error))
    }
  })
}
