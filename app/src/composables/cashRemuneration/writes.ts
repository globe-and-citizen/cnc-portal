import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { Address } from 'viem'
import { cashRemunerationEip712Abi } from '@/artifacts/abi/generated'
import {
  useContractWritesV3,
  type WriteFunctionName
} from '@/composables/contracts/useContractWritesV3'
import { useTeamStore } from '@/stores/teamStore'

type CashRemunerationFunctionNames = WriteFunctionName<typeof cashRemunerationEip712Abi>

/**
 * A Cash Remuneration other than the team's current one — used to drain the one
 * belonging to an archived Officer generation. Omit it and the write targets
 * the current generation.
 */
export type CashRemunerationAddressOverride = MaybeRefOrGetter<Address | undefined>

function useCashRemunerationContractWrite<F extends CashRemunerationFunctionNames>(
  functionName: F,
  address?: CashRemunerationAddressOverride
) {
  const teamStore = useTeamStore()
  const contractAddress = computed(
    () =>
      toValue(address) ??
      (teamStore.getContractAddressByType('CashRemunerationEIP712') as Address | undefined)
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

export function useOwnerWithdrawAllToBank(address?: CashRemunerationAddressOverride) {
  return useCashRemunerationContractWrite('ownerWithdrawAllToBank', address)
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
