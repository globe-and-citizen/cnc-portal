import { useConnection, useReadContract } from '@wagmi/vue'
import type { Address } from 'viem'
import { FEE_COLLECTOR_ABI } from '~/artifacts/abi/feeCollector'
import { FEE_COLLECTOR_ADDRESS } from '~/constant/index'

export function useFeeBalance() {
  // Native balance
  return useReadContract({
    address: FEE_COLLECTOR_ADDRESS as Address,
    abi: FEE_COLLECTOR_ABI,
    functionName: 'getBalance'
  })
}

export function useFeeTokenBalance(tokenAddress: Address) {
  // ERC20 token balance
  return useReadContract({
    address: FEE_COLLECTOR_ADDRESS as Address,
    abi: FEE_COLLECTOR_ABI,
    functionName: 'getTokenBalance',
    args: [tokenAddress]
  })
}

export function useFeeCollectorOwner() {
  // Owner address
  return useReadContract({
    address: FEE_COLLECTOR_ADDRESS as Address,
    abi: FEE_COLLECTOR_ABI,
    functionName: 'owner'
  })
}

export function isFeeCollectorOwner() {
  const connection = useConnection()
  const { data: owner } = useFeeCollectorOwner()
  return computed(() => {
    if (!owner.value || !connection.address.value) {
      return false
    }
    return (owner.value as Address).toLowerCase() === connection.address.value.toLowerCase()
  })
}

export function useFeeConfigs() {
  // Fee configurations
  return useReadContract({
    address: FEE_COLLECTOR_ADDRESS as Address,
    abi: FEE_COLLECTOR_ABI,
    functionName: 'getAllFeeConfigs'
  })
}
