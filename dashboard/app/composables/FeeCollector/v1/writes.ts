import { resolveFeeCollector } from '~/artifacts/feeCollectorRegistry'
import { useContractWritesV3 } from '~/composables/useContractWritesV3'

// Statically bound to the V1 deployment. Exposes only writes present in the
// V1 ABI. Callers import from this module to explicitly write against V1.
const { address, abi } = resolveFeeCollector('V1')

function useV1Write(functionName: string) {
  return useContractWritesV3({ contractAddress: address, abi, functionName })
}

export const useSetFee = () => useV1Write('setFee')
export const useWithdrawAll = () => useV1Write('withdraw')
export const useSetFeeBeneficiary = () => useV1Write('setFeeBeneficiary')
export const useTransferOwnership = () => useV1Write('transferOwnership')
export const useAddTokenSupport = () => useV1Write('addTokenSupport')
export const useRemoveTokenSupport = () => useV1Write('removeTokenSupport')
