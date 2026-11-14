import { useContractWritesV3 } from '~/composables/useContractWritesV3'
import { resolveManagedFeeCollector } from './resolveManagedFeeCollector'

function useManagedWrite(functionName: string) {
  const { address, abi } = resolveManagedFeeCollector()
  return useContractWritesV3({ contractAddress: address, abi, functionName })
}

export const useSetFee = () => useManagedWrite('setFee')
export const useWithdrawAll = () => useManagedWrite('withdraw')
export const useSetFeeBeneficiary = () => useManagedWrite('setFeeBeneficiary')
export const useTransferOwnership = () => useManagedWrite('transferOwnership')
export const useAddTokenSupport = () => useManagedWrite('addTokenSupport')
export const useRemoveTokenSupport = () => useManagedWrite('removeTokenSupport')
