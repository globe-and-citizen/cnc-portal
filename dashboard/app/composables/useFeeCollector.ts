import { computed } from 'vue'
import { useConnection } from '@wagmi/vue'
import type { Address } from 'viem'
import { formatUnits, zeroAddress } from 'viem'
import { FEE_COLLECTOR_SUPPORTED_TOKENS, TOKEN_DECIMALS, TOKEN_SYMBOLS } from '@/constant'
import type { TokenDisplay } from '@/types/token'
import { useFeeBalance, useFeeTokenBalance } from '~/composables/FeeCollector/read'

export const useFeeCollector = () => {
  const connection = useConnection()

  // Native balance
  const {
    data: nativeBalance,
    isLoading: isLoadingNativeBalance
    // error: errorNative
  } = useFeeBalance()

  // USDC balance
  const {
    data: usdcBalance,
    isLoading: isLoadingUsdc
    // error: errorUsdc
  } = useFeeTokenBalance(FEE_COLLECTOR_SUPPORTED_TOKENS[0] as Address)

  // USDT balance
  const {
    data: usdtBalance,
    isLoading: isLoadingUsdt
    // error: errorUsdt
  } = useFeeTokenBalance(FEE_COLLECTOR_SUPPORTED_TOKENS[1] as Address)

  const tokenPriceStore = useTokenPriceStore()

  const validateBalance = (balance: unknown): balance is bigint => {
    return balance !== undefined && typeof balance === 'bigint'
  }

  // Utility function to get token formatted Balance

  const formatTokenBalance = (balance: unknown, decimals: number = 18) => {
    return validateBalance(balance)
      ? formatUnits(balance, decimals)
      : '0'
  }

  const formatTokenBalanceValue = (balance: unknown, address: Address, decimals: number = 18, symbol: string) => {
    if (validateBalance(balance)) {
      const val = tokenPriceStore.getTokenPrice({ address: address, symbol }) * Number(formatUnits(balance, decimals))

      if (val < 0.01) {
        if (val < 0.0001) {
          return '< $0.0001'
        }
        // Show 4 decimals for cents
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 4,
          maximumFractionDigits: 4
        }).format(val)
      }

      // Normal formatting for >= $0.01
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(val)
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(0)
  }

  // --- Add contract read for fee configs ---
  const { data: feeConfigsRaw, refetch: refetchFeeConfigs, isLoading: isLoadingFeeConfigs } = useReadContract({
    address: FEE_COLLECTOR_ADDRESS as Address,
    abi: FEE_COLLECTOR_ABI,
    functionName: 'getAllFeeConfigs'
  })

  // Format fee configs for the UI
  const feeConfigs = computed(() => {
    // If contract returns undefined, fallback to empty array
    if (!feeConfigsRaw.value) return []
    // If contract returns array of structs, just pass through
    return feeConfigsRaw.value as { contractType: string, feeBps: number }[]
  })

  // Build tokens list (matches tokenHelpers.ts buildTokenList logic)
  const tokens = computed<TokenDisplay[]>(() => {
    return [
      {
        address: zeroAddress,
        symbol: connection.chain.value?.nativeCurrency.symbol || 'ETH',
        decimals: connection.chain.value?.nativeCurrency.decimals || 18,
        balance: validateBalance(nativeBalance.value)
          ? nativeBalance.value
          : 0n,
        formattedBalance: formatTokenBalance(nativeBalance.value, connection.chain.value?.nativeCurrency.decimals || 18),
        shortAddress: 'Native Token',
        formattedValue: formatTokenBalanceValue(
          nativeBalance.value,
          zeroAddress,
          connection.chain.value?.nativeCurrency.decimals || 18,
          connection.chain.value?.nativeCurrency.symbol || 'ETH'
        )
      },
      {
        address: FEE_COLLECTOR_SUPPORTED_TOKENS[0] as Address,
        symbol: TOKEN_SYMBOLS[FEE_COLLECTOR_SUPPORTED_TOKENS[0] as `0x${string}`] || 'USDC',
        decimals: TOKEN_DECIMALS['USDC'],
        balance: validateBalance(usdcBalance.value)
          ? usdcBalance.value
          : 0n,
        formattedBalance: formatTokenBalance(usdcBalance.value, TOKEN_DECIMALS['USDC']),
        shortAddress: `${(FEE_COLLECTOR_SUPPORTED_TOKENS[0] as Address).slice(0, 6)}...${(FEE_COLLECTOR_SUPPORTED_TOKENS[0] as Address).slice(-4)}`,
        formattedValue: formatTokenBalanceValue(
          usdcBalance.value,
          FEE_COLLECTOR_SUPPORTED_TOKENS[0] as Address,
          TOKEN_DECIMALS['USDC'],
          TOKEN_SYMBOLS[FEE_COLLECTOR_SUPPORTED_TOKENS[0] as `0x${string}`] || 'USDC'
        )
      },
      {
        address: FEE_COLLECTOR_SUPPORTED_TOKENS[1] as Address,
        symbol: TOKEN_SYMBOLS[FEE_COLLECTOR_SUPPORTED_TOKENS[1] as `0x${string}`] || 'USDT',
        decimals: TOKEN_DECIMALS['USDT'],
        balance: validateBalance(usdtBalance.value)
          ? usdtBalance.value
          : 0n,
        formattedBalance: formatTokenBalance(usdtBalance.value, TOKEN_DECIMALS['USDT']),
        shortAddress: `${(FEE_COLLECTOR_SUPPORTED_TOKENS[1] as Address).slice(0, 6)}...${(FEE_COLLECTOR_SUPPORTED_TOKENS[1] as Address).slice(-4)}`,
        formattedValue: formatTokenBalanceValue(
          usdtBalance.value,
          FEE_COLLECTOR_SUPPORTED_TOKENS[1] as Address,
          TOKEN_DECIMALS['USDT'],
          TOKEN_SYMBOLS[FEE_COLLECTOR_SUPPORTED_TOKENS[1] as `0x${string}`] || 'USDT'
        )
      }
    ]
  })

  const isLoading = computed(() =>
    isLoadingNativeBalance.value || isLoadingUsdc.value || isLoadingUsdt.value
  )

  return {
    // isFeeCollectorOwner,
    // nativeBalance,
    // usdcBalance,
    // usdtBalance,
    tokens,
    isLoading
    // isLoadingNativeBalance,
    // isLoadingUsdc,
    // isLoadingUsdt,
    // errorNative,
    // errorUsdc,
    // errorUsdt
  }
}
