import type { ExtractAbiFunctionNames } from 'abitype'
import type { Address } from 'viem'
import { FEE_COLLECTOR_ABI } from '~/artifacts/abi/feeCollector'
import { FEE_COLLECTOR_ADDRESS } from '~/constant/index'
import { useContractWritesV3 } from '~/composables/useContractWritesV3'

export type FeeCollectorFunctionNames = ExtractAbiFunctionNames<typeof FEE_COLLECTOR_ABI>

/**
 * Generic V3 write for any function on the FeeCollector. Contract coordinates
 * are bound once at construction; callers pass `args` per-call via `mutateAsync`.
 *
 * The returned object is a TanStack mutation, so consumers get `isPending`,
 * `isSuccess`, `error`, `data`, `mutate`, `mutateAsync` etc. On success the V3
 * helper invalidates all `['readContract', { address, chainId }]` queries for
 * the FeeCollector — so any wagmi/vue `useReadContract` subscribed to this
 * contract (balances, owner, beneficiary, fee configs…) refetches automatically.
 */
export function useFeeCollectorWrite<T extends FeeCollectorFunctionNames>(
  functionName: T
) {
  return useContractWritesV3({
    contractAddress: FEE_COLLECTOR_ADDRESS as Address,
    abi: FEE_COLLECTOR_ABI,
    functionName
  })
}

export const useSetFee = () => useFeeCollectorWrite('setFee')
export const useWithdrawAll = () => useFeeCollectorWrite('withdraw')
export const useSetFeeBeneficiary = () => useFeeCollectorWrite('setFeeBeneficiary')
export const useTransferOwnership = () => useFeeCollectorWrite('transferOwnership')
