import { computed } from 'vue'
import { CASH_REMUNERATION_EIP712_ABI } from '@/artifacts/abi/cash-remuneration-eip712'
import { useContractWritesV3 } from '@/composables/contracts/useContractWritesV3'
import { useTeamStore } from '@/stores/teamStore'
import type { ExtractAbiFunctionNames } from 'abitype'

type CashRemunerationFunctionNames = ExtractAbiFunctionNames<typeof CASH_REMUNERATION_EIP712_ABI>

function useCashRemunerationContractWrite(functionName: CashRemunerationFunctionNames) {
  const teamStore = useTeamStore()
  const contractAddress = computed(() =>
    teamStore.getContractAddressByType('CashRemunerationEIP712')
  )
  return useContractWritesV3({
    contractAddress,
    abi: CASH_REMUNERATION_EIP712_ABI,
    functionName
  })
}

export function useWithdraw() {
  return useCashRemunerationContractWrite('withdraw')
}

export function useOwnerWithdrawAllToBank() {
  return useCashRemunerationContractWrite('ownerWithdrawAllToBank')
}

export function useEnableClaim() {
  return useCashRemunerationContractWrite('enableClaim')
}

export function useDisableClaim() {
  return useCashRemunerationContractWrite('disableClaim')
}

// UNUSED — no consumers outside this file. See the commented-out block for
// definitions of useAddTokenSupport, useRemoveTokenSupport, useInitialize,
// useSetOfficerAddress, useTransferOwnership, useRenounceOwnership,
// usePause, useUnpause.
/*
export function useAddTokenSupport() {
  return useCashRemunerationContractWrite('addTokenSupport')
}

export function useRemoveTokenSupport() {
  return useCashRemunerationContractWrite('removeTokenSupport')
}

export function useInitialize() {
  return useCashRemunerationContractWrite('initialize')
}

export function useSetOfficerAddress() {
  return useCashRemunerationContractWrite('setOfficerAddress')
}

export function useTransferOwnership() {
  return useCashRemunerationContractWrite('transferOwnership')
}

export function useRenounceOwnership() {
  return useCashRemunerationContractWrite('renounceOwnership')
}

export function usePause() {
  return useCashRemunerationContractWrite('pause')
}

export function useUnpause() {
  return useCashRemunerationContractWrite('unpause')
}
*/
