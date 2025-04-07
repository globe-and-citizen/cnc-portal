import { computed } from 'vue'
import { useBalance, useReadContract, useChainId } from '@wagmi/vue'
import { formatEther, type Address } from 'viem'
import { USDC_ADDRESS } from '@/constant'
import ERC20ABI from '@/artifacts/abi/erc20.json'
import { useCryptoPrice } from './useCryptoPrice'

export interface ContractBalance {
  nativeToken: {
    balance: string
    formatted: string
  }
  usdc: {
    balance: string
    formatted: string
  }
  totalValueUSD: string
  isLoading: boolean
  error: Error | null
}

export function useContractBalance(address: Address | undefined) {
  const chainId = useChainId()
  const { price: usdcPrice } = useCryptoPrice('usd-coin')

  const {
    data: nativeBalance,
    isLoading: isLoadingNative,
    error: nativeError,
    refetch: fetchNativeBalance
  } = useBalance({
    address,
    chainId
  })

  const {
    data: usdcBalance,
    isLoading: isLoadingUsdc,
    error: usdcError,
    refetch: fetchUsdcBalance
  } = useReadContract({
    address: USDC_ADDRESS as Address,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: [address as Address]
  })

  const formattedNativeBalance = computed(() =>
    nativeBalance.value ? formatEther(nativeBalance.value.value) : '0'
  )

  const formattedUsdcBalance = computed(() =>
    usdcBalance.value ? (Number(usdcBalance.value) / 1e6).toString() : '0'
  )

  const totalValueUSD = computed(() => {
    const nativeValue = Number(formattedNativeBalance.value) * (usdcPrice.value || 0)
    const usdcValue = Number(formattedUsdcBalance.value)
    return (nativeValue + usdcValue).toFixed(2)
  })

  const isLoading = computed(() => isLoadingNative.value || isLoadingUsdc.value)

  const error = computed(() => nativeError.value || usdcError.value)

  const refetch = async () => {
    await Promise.all([fetchNativeBalance(), fetchUsdcBalance()])
  }

  return {
    balances: {
      nativeToken: {
        balance: formattedNativeBalance.value,
        formatted: formattedNativeBalance.value
      },
      usdc: {
        balance: formattedUsdcBalance.value,
        formatted: formattedUsdcBalance.value
      },
      totalValueUSD: totalValueUSD.value
    },
    isLoading: isLoading.value,
    error: error.value,
    refetch
  }
}
