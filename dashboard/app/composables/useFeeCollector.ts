import { computed } from 'vue'
import { useConnection } from '@wagmi/vue'
import type { Address } from 'viem'
import { formatUnits } from 'viem'
import { getSupportedTokens, getUSDCAddress, getUSDTAddress } from '@/constant'
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
  } = useFeeTokenBalance(getUSDCAddress())

  // USDT balance
  const {
    data: usdtBalance,
    isLoading: isLoadingUsdt
    // error: errorUsdt
  } = useFeeTokenBalance(getUSDTAddress())

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
    // Get token prince in USD ex: 1 USDC = $1.0
    const tokenPrice = tokenPriceStore.getTokenPrice({ address: address, symbol })

    // Convert the token balance in bigint to number: ex: 1000000n -> 1.0 (for 6 decimals)
    const tokenAmount = Number(formatUnits(validateBalance(balance) ? balance : 0n, decimals))

    // Format the token value in USD : ex: $1.0 * 1.0 = 1.0 -> $1.00
    return formatUSD(tokenPrice * tokenAmount)
  }

  // Build tokens list using getSupportedTokens helper
  const tokens = computed<TokenDisplay[]>(() => {
    const nativeSymbol = connection.chain.value?.nativeCurrency.symbol || 'ETH'
    const chainId = connection.chain.value?.id

    const supportedTokens = getSupportedTokens(nativeSymbol, chainId)

    // Map balance data to each token config
    const balanceMap: Record<string, unknown> = {
      native: nativeBalance.value,
      usdc: usdcBalance.value,
      usdt: usdtBalance.value
    }

    return supportedTokens.map((token) => {
      const balance = balanceMap[token.id]
      return {
        address: token.address,
        symbol: token.symbol,
        decimals: token.decimals,
        balance: validateBalance(balance) ? balance : 0n,
        formattedBalance: formatTokenBalance(balance, token.decimals),
        shortAddress: token.shortAddress,
        formattedValue: formatTokenBalanceValue(balance, token.address, token.decimals, token.symbol)
      }
    })
  })

  const isLoading = computed(() =>
    isLoadingNativeBalance.value || isLoadingUsdc.value || isLoadingUsdt.value
  )

  return {
    tokens,
    isLoading
  }
}
