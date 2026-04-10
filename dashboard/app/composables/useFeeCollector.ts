import { computed } from 'vue'
import { useConnection } from '@wagmi/vue'
import type { Address } from 'viem'
import { formatUnits } from 'viem'
import { getSupportedTokens, getUSDCAddress, getUSDTAddress } from '@/constant'
import type { TokenDisplay } from '@/types/token'
import {
  useFeeBalance,
  useFeeSupportedTokens,
  useFeeTokenBalance
} from '~/composables/FeeCollector/read'

export const useFeeCollector = () => {
  const connection = useConnection()

  // Native balance
  const {
    data: nativeBalance,
    isLoading: isLoadingNativeBalance,
    error: errorNative
  } = useFeeBalance()

  // On-chain list of ERC20s the FeeCollector currently supports — source of truth
  const {
    data: onChainSupportedTokens,
    isLoading: isLoadingSupportedTokens,
    error: errorSupportedTokens
  } = useFeeSupportedTokens()

  // Lowercased set of on-chain supported ERC20 addresses for cheap membership checks.
  // Empty until the contract read resolves, which keeps the gated token reads disabled
  // during load and prevents TokenNotSupported reverts for stale local addresses.
  const onChainSupportedSet = computed<Set<string>>(() => {
    const list = onChainSupportedTokens.value as readonly Address[] | undefined
    return new Set((list ?? []).map(addr => addr.toLowerCase()))
  })

  const isTokenOnChainSupported = (address: Address) =>
    computed(() => onChainSupportedSet.value.has(address.toLowerCase()))

  // USDC balance — only read if the collector actually supports the current USDC address
  const {
    data: usdcBalance,
    isLoading: isLoadingUsdc,
    error: errorUsdc
  } = useFeeTokenBalance(getUSDCAddress(), isTokenOnChainSupported(getUSDCAddress()))

  // USDT balance — same gating
  const {
    data: usdtBalance,
    isLoading: isLoadingUsdt,
    error: errorUsdt
  } = useFeeTokenBalance(getUSDTAddress(), isTokenOnChainSupported(getUSDTAddress()))

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

  // Build tokens list: native is always shown; each known ERC20 is only shown
  // if its address appears in the on-chain supported list.
  const tokens = computed<TokenDisplay[]>(() => {
    const nativeSymbol = connection.chain.value?.nativeCurrency.symbol || 'ETH'
    const chainId = connection.chain.value?.id

    const localRegistry = getSupportedTokens(nativeSymbol, chainId)
    const supportedSet = onChainSupportedSet.value
    console.log('Local registry:', localRegistry)
    console.log('On-chain supported set:', supportedSet)

    // Balance lookup keyed by token id — matches entries in the local registry.
    const balanceMap: Record<string, unknown> = {
      native: nativeBalance.value,
      usdc: usdcBalance.value,
      usdt: usdtBalance.value
    }

    return localRegistry
      .filter(token => token.id === 'native' || supportedSet.has(token.address.toLowerCase()))
      .map((token) => {
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

  // Addresses the collector reports supporting that the dashboard has no metadata for.
  // Surfacing them lets callers flag unknown tokens instead of silently hiding them.
  const unknownSupportedTokens = computed<Address[]>(() => {
    const nativeSymbol = connection.chain.value?.nativeCurrency.symbol || 'ETH'
    const chainId = connection.chain.value?.id
    const known = new Set(
      getSupportedTokens(nativeSymbol, chainId)
        .filter(token => token.id !== 'native')
        .map(token => token.address.toLowerCase())
    )
    const list = (onChainSupportedTokens.value as readonly Address[] | undefined) ?? []
    return list.filter(addr => !known.has(addr.toLowerCase()))
  })

  const isLoading = computed(() =>
    isLoadingNativeBalance.value
    || isLoadingSupportedTokens.value
    || isLoadingUsdc.value
    || isLoadingUsdt.value
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
    if (errorSupportedTokens.value) {
      errors.push({ id: 'supportedTokens', error: errorSupportedTokens.value })
    }
    if (errorUsdc.value) {
      errors.push({ id: 'usdc', error: errorUsdc.value })
    }
    if (errorUsdt.value) {
      errors.push({ id: 'usdt', error: errorUsdt.value })
    }
    return errors.length > 0 ? errors : null
  })

  return {
    tokens,
    unknownSupportedTokens,
    isLoading,
    totalUsdAmount,
    formattedTotalUsd,
    error
  }
}
