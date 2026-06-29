import { computed } from 'vue'
import type { ExtractAbiFunctionNames } from 'abitype'
import { FIXED_RETURN_ABI } from '@/artifacts/abi/fixed-return'
import { useContractWritesV3 } from '@/composables/contracts/useContractWritesV3'
import { useFixedReturnAddress } from './reads'

type FixedReturnFunctionNames = ExtractAbiFunctionNames<typeof FIXED_RETURN_ABI>

function useFixedReturnContractWrite(functionName: FixedReturnFunctionNames) {
  const fixedReturnAddress = useFixedReturnAddress()
  return useContractWritesV3({
    contractAddress: computed(() => fixedReturnAddress.value ?? undefined),
    abi: FIXED_RETURN_ABI,
    functionName
  })
}

export function useFixedReturnCreateLendingOffer() {
  return useFixedReturnContractWrite('createLendingOffer')
}

export function useFixedReturnLendFunds() {
  return useFixedReturnContractWrite('lendFunds')
}

export function useFixedReturnMarkAsRefundable() {
  return useFixedReturnContractWrite('markAsRefundable')
}

export function useFixedReturnClaimRefund() {
  return useFixedReturnContractWrite('claimRefund')
}

export function useFixedReturnRepayLenders() {
  return useFixedReturnContractWrite('repayLenders')
}

export function useFixedReturnAddTokenSupport() {
  return useFixedReturnContractWrite('addTokenSupport')
}

export function useFixedReturnRemoveTokenSupport() {
  return useFixedReturnContractWrite('removeTokenSupport')
}
