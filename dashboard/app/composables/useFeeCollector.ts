import { computed } from 'vue'
import { useAccount, useReadContract } from '@wagmi/vue'
import type { Address } from 'viem'
import { FEE_COLLECTOR_ADDRESS, FEE_COLLECTOR_SUPPORTED_TOKENS } from '@/constant'
import { FEE_COLLECTOR_ABI } from '@/artifacts/abi/feeCollector'

export const useFeeCollector = () => {
  const { address: userAddress } = useAccount()

  // Owner check
  const { data: feeCollectorOwner } = useReadContract({
    address: FEE_COLLECTOR_ADDRESS as Address,
    abi: FEE_COLLECTOR_ABI,
    functionName: 'owner'
  })

  const isFeeCollectorOwner = computed(
    () => feeCollectorOwner.value === userAddress.value
  )

  // Native balance
  const {
    data: nativeBalance,
    isLoading: isLoadingNativeBalance,
    refetch: refetchNative
  } = useReadContract({
    address: FEE_COLLECTOR_ADDRESS as Address,
    abi: FEE_COLLECTOR_ABI,
    functionName: 'getBalance'
  })

  // USDC balance
  const { data: usdcBalance, refetch: refetchUsdc } = useReadContract({
    address: FEE_COLLECTOR_ADDRESS as Address,
    abi: FEE_COLLECTOR_ABI,
    functionName: 'getTokenBalance',
    args: [FEE_COLLECTOR_SUPPORTED_TOKENS[0]]
  })

  // USDT balance
  const { data: usdtBalance, refetch: refetchUsdt } = useReadContract({
    address: FEE_COLLECTOR_ADDRESS as Address,
    abi: FEE_COLLECTOR_ABI,
    functionName: 'getTokenBalance',
    args: [FEE_COLLECTOR_SUPPORTED_TOKENS[1]]
  })

  const refetchAll = async () => {
    await Promise.all([refetchNative(), refetchUsdc(), refetchUsdt()])
  }

  return {
    isFeeCollectorOwner,
    nativeBalance,
    usdcBalance,
    usdtBalance,
    isLoadingNativeBalance,
    refetchNative,
    refetchUsdc,
    refetchUsdt,
    refetchAll
  }
}
