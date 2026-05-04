import { computed } from 'vue'
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

export function useDeposit() {
  return useSafeDepositRouterContractWrite('deposit')
}
