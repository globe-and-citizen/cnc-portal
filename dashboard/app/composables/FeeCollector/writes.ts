import type { ExtractAbiFunctionNames } from 'abitype'
import type { Address } from 'viem'
import { FEE_COLLECTOR_ABI } from '~/artifacts/abi/feeCollector'
import { FEE_COLLECTOR_ADDRESS } from '~/constant/index'

export type FeeCollectorFunctionNames = ExtractAbiFunctionNames<typeof FEE_COLLECTOR_ABI>

export function useFeeCollectorContractWrite(options: {
  functionName: FeeCollectorFunctionNames
  args?: MaybeRef<readonly unknown[]>
  value?: MaybeRef<bigint>
}) {
  return useContractWrites({
    contractAddress: FEE_COLLECTOR_ADDRESS as MaybeRef<Address>,
    abi: FEE_COLLECTOR_ABI,
    functionName: options.functionName,
    args: options.args ?? [],
    ...(options.value !== undefined ? { value: options.value } : {})
  })
}

export function useSetFee(
  contractType: MaybeRef<string>,
  feeBps: MaybeRef<number>
) {
  const args = computed(() => [unref(contractType), unref(feeBps)] as readonly unknown[])
  return useFeeCollectorContractWrite({
    functionName: 'setFee',
    args
  })
}

// 'withdraw' : 'withdrawToken',

export function useWithdrawToken(
  tokenAddress: MaybeRef<Address>,
  amount: MaybeRef<bigint>
) {
  const args = computed(() => [unref(tokenAddress), unref(amount)] as readonly unknown[])
  return useFeeCollectorContractWrite({
    functionName: 'withdrawToken',
    args
  })
}

export function useWithdrawNative(
  amount: MaybeRef<bigint>
) {
  const args = computed(() => [unref(amount)] as readonly unknown[])
  return useFeeCollectorContractWrite({
    functionName: 'withdraw',
    args
  })
}
