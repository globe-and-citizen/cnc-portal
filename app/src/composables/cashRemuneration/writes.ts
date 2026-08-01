import { computed } from 'vue'
import { cashRemunerationEip712Abi } from '@/artifacts/abi/generated'
import {
  useContractWritesV3,
  type WriteFunctionName
} from '@/composables/contracts/useContractWritesV3'
import { useTeamStore } from '@/stores/teamStore'

type CashRemunerationFunctionNames = WriteFunctionName<typeof cashRemunerationEip712Abi>

function useCashRemunerationContractWrite<F extends CashRemunerationFunctionNames>(
  functionName: F
) {
  const teamStore = useTeamStore()
  const contractAddress = computed(() =>
    teamStore.getContractAddressByType('CashRemunerationEIP712')
  )
  return useContractWritesV3({
    contractAddress,
    abi: cashRemunerationEip712Abi,
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
