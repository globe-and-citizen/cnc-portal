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
    isLoading: isLoadingNativeBalance,
    error: errorNative
  } = useFeeBalance()

  // USDC balance
  const {
    data: usdcBalance,
    isLoading: isLoadingUsdc,
    error: errorUsdc
  } = useFeeTokenBalance(getUSDCAddress())

  // USDT balance
  const {
    data: usdtBalance,
    isLoading: isLoadingUsdt,
    error: errorUsdt
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

  // Calculate total USD balance (raw and formatted)
  const totalUsdAmount = computed(() => {
    return tokens.value.reduce((sum, token) => {
      // Parse formattedValue back to number (strip $ and commas)
      const rawValue = typeof token.formattedValue === 'string'
        ? Number(token.formattedValue.replace(/[^\d.-]/g, ''))
        : 0
      return sum + rawValue
    }, 0)
  })

  const formattedTotalUsd = computed(() => formatUSD(totalUsdAmount.value))

  // Return an array of items with errors
  const error = computed(() => {
    const errors = []
    if (errorNative.value) {
      errors.push({ id: 'native', error: errorNative.value })
    }
    if (errorUsdc.value) {
      errors.push({ id: 'usdc', error: errorUsdc.value })
      console.log('USDC Error:', errorUsdc.value)
    }
    if (errorUsdt.value) {
      errors.push({ id: 'usdt', error: errorUsdt.value })
    }
    return errors.length > 0 ? errors : null
  })

  return {
    tokens,
    isLoading,
    totalUsdAmount,
    formattedTotalUsd,
    error
  }
}
