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

  const valideBalance = (balance: unknown): balance is bigint => {
    return balance !== undefined && typeof balance === 'bigint'
  }

  // Utility function to get toke formatted Balance

  const formatTokenBalance = (balance: unknown, decimals: number = 18) => {
    return valideBalance(balance)
      ? formatUnits(balance, decimals)
      : '0'
  }

  const formatTokenBalanceValue = (balance: unknown, address: Address, decimals: number = 18, symbol: string) => {
    if (valideBalance(balance)) {
      const val = tokenPriceStore.getTokenPrice({ address: address, symbol }) * Number(formatUnits(balance, decimals))

      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
      }).format(val)
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    }).format(0)
  }

  // Build tokens list (matches tokenHelpers.ts buildTokenList logic)
  const tokens = computed<TokenDisplay[]>(() => {
    const arr: TokenDisplay[] = [
      {
        address: zeroAddress,
        symbol: connection.chain.value?.nativeCurrency.symbol || 'ETH',
        decimals: connection.chain.value?.nativeCurrency.decimals || 18,
        balance: valideBalance(nativeBalance.value)
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
        balance: valideBalance(usdcBalance.value)
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
        balance: valideBalance(usdtBalance.value)
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
    return arr
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
