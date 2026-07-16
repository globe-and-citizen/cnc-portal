import { resolveFeeCollector } from '~/artifacts/feeCollectorRegistry'
import { useContractWritesV3 } from '~/composables/useContractWritesV3'

// Statically bound to the V0 deployment. Exposes only writes present in the V0
// ABI — includes withdrawToken (legacy-only), excludes setFeeBeneficiary (V1-only).
const { address, abi } = resolveFeeCollector('V0')

function useV0Write(functionName: string) {
  return useContractWritesV3({ contractAddress: address, abi, functionName })
}

export const useSetFee = () => useV0Write('setFee')
export const useWithdrawAll = () => useV0Write('withdraw')
export const useWithdrawToken = () => useV0Write('withdrawToken')
export const useTransferOwnership = () => useV0Write('transferOwnership')
export const useAddTokenSupport = () => useV0Write('addTokenSupport')
export const useRemoveTokenSupport = () => useV0Write('removeTokenSupport')
