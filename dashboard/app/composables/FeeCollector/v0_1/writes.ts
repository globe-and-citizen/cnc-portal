import { resolveFeeCollector } from '~/artifacts/feeCollectorRegistry'
import { useContractWritesV3 } from '~/composables/useContractWritesV3'

// Statically bound to the V0.1 deployment. Exposes only writes present in the V0
// ABI — includes withdrawToken (legacy-only), excludes setFeeBeneficiary (V1-only).
const { address, abi } = resolveFeeCollector('V0.1')

function useV01Write(functionName: string) {
  return useContractWritesV3({ contractAddress: address, abi, functionName })
}

export const useSetFee = () => useV01Write('setFee')
export const useWithdrawAll = () => useV01Write('withdraw')
export const useWithdrawToken = () => useV01Write('withdrawToken')
export const useTransferOwnership = () => useV01Write('transferOwnership')
export const useAddTokenSupport = () => useV01Write('addTokenSupport')
export const useRemoveTokenSupport = () => useV01Write('removeTokenSupport')
