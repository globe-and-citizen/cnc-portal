import { computed } from 'vue'
import { useAccount, useReadContract } from '@wagmi/vue'
import type { Address } from 'viem'
import { formatUnits } from 'viem'
import { FEE_COLLECTOR_ADDRESS, FEE_COLLECTOR_SUPPORTED_TOKENS, TOKEN_DECIMALS, TOKEN_SYMBOLS } from '@/constant'
import { FEE_COLLECTOR_ABI } from '~/artifacts/abi/feeCollector'
import { useNetwork } from '~/utils/network'
import { useTokenPrices } from './useTokenPrices'
import type { TokenDisplay } from '@/types/token'

// Helper to create a token display object (matches tokenHelpers.ts)
const makeToken = (
  address: string,
  raw: bigint,
  decimals: number,
  symbol: string,
  isNative: boolean
): TokenDisplay => ({
  address,
  symbol,
  decimals,
  balance: raw,
  formattedBalance: formatUnits(raw, decimals),
  pendingWithdrawals: 0n,
  formattedPending: '0',
  totalWithdrawn: 0n,
  formattedWithdrawn: '0',
  isNative,
  shortAddress: isNative ? 'Native Token' : `${address.slice(0, 6)}...${address.slice(-4)}`
})

export const useFeeCollector = () => {
  const { address: userAddress } = useAccount()
  const { nativeSymbol } = useNetwork()
  const { isLoading: isLoadingPrices, getTokenUSDValue } = useTokenPrices()

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
    refetch: refetchNative,
    error: errorNative
  } = useReadContract({
    address: FEE_COLLECTOR_ADDRESS as Address,
    abi: FEE_COLLECTOR_ABI,
    functionName: 'getBalance'
  })

  // USDC balance
  const {
    data: usdcBalance,
    isLoading: isLoadingUsdc,
    refetch: refetchUsdc,
    error: errorUsdc
  } = useReadContract({
    address: FEE_COLLECTOR_ADDRESS as Address,
    abi: FEE_COLLECTOR_ABI,
    functionName: 'getTokenBalance',
    args: FEE_COLLECTOR_SUPPORTED_TOKENS?.[0]
      ? [FEE_COLLECTOR_SUPPORTED_TOKENS[0] as Address]
      : undefined,
    query: {
      enabled: !!FEE_COLLECTOR_SUPPORTED_TOKENS?.[0]
    }
  })

  // USDT balance
  const {
    data: usdtBalance,
    isLoading: isLoadingUsdt,
    refetch: refetchUsdt,
    error: errorUsdt
  } = useReadContract({
    address: FEE_COLLECTOR_ADDRESS as Address,
    abi: FEE_COLLECTOR_ABI,
    functionName: 'getTokenBalance',
    args: FEE_COLLECTOR_SUPPORTED_TOKENS?.[1]
      ? [FEE_COLLECTOR_SUPPORTED_TOKENS[1] as Address]
      : undefined,
    query: {
      enabled: !!FEE_COLLECTOR_SUPPORTED_TOKENS?.[1]
    }
  })

  // Build tokens list (matches tokenHelpers.ts buildTokenList logic)
  const tokens = computed<TokenDisplay[]>(() => {
    const arr: TokenDisplay[] = []

    // Native token - always show even if undefined (will show as 0)
    const nativeBal = nativeBalance.value !== undefined && typeof nativeBalance.value === 'bigint'
      ? nativeBalance.value
      : 0n
    arr.push(makeToken('native', nativeBal, 18, nativeSymbol.value, true))

    // Build supported tokens array for processing - always include all configured tokens
    const supportedTokensBalances: Array<{ address: string, balance: bigint }> = []

    // USDC - always include even if zero
    if (FEE_COLLECTOR_SUPPORTED_TOKENS?.[0]) {
      const balance = usdcBalance.value && typeof usdcBalance.value === 'bigint'
        ? usdcBalance.value
        : 0n
      supportedTokensBalances.push({
        address: FEE_COLLECTOR_SUPPORTED_TOKENS[0],
        balance
      })
    }

    // USDT - always include even if zero
    if (FEE_COLLECTOR_SUPPORTED_TOKENS?.[1]) {
      const balance = usdtBalance.value && typeof usdtBalance.value === 'bigint'
        ? usdtBalance.value
        : 0n
      supportedTokensBalances.push({
        address: FEE_COLLECTOR_SUPPORTED_TOKENS[1],
        balance
      })
    }

    // ERC20 tokens (matches tokenHelpers.ts logic exactly)
    supportedTokensBalances.forEach(({ address, balance }) => {
      const checksummedAddress = address as `0x${string}`
      const symbol = TOKEN_SYMBOLS[checksummedAddress] || 'UNKNOWN'
      const decimals = TOKEN_DECIMALS[symbol as keyof typeof TOKEN_DECIMALS] || 18

      arr.push(makeToken(address, balance, decimals, symbol, false))
    })

    return arr
  })

  // Calculate total USD value (reactive) - using getTokenUSDValue from composable
  const totalUSD = computed(() => {
    let total = 0

    tokens.value.forEach((token) => {
      const amount = parseFloat(token.formattedBalance)

      // Skip if amount is NaN or 0
      if (isNaN(amount) || amount === 0) return

      // Use the composable's getTokenUSDValue function
      const usdValue = getTokenUSDValue(token, amount)

      // Skip if no price available
      if (usdValue === 0) return

      total += usdValue
    })

    return total
  })

  const isLoading = computed(() =>
    isLoadingNativeBalance.value || isLoadingUsdc.value || isLoadingUsdt.value
  )

  const refetchAll = async () => {
    const promises = [refetchNative()]

    if (FEE_COLLECTOR_SUPPORTED_TOKENS?.[0]) {
      promises.push(refetchUsdc())
    }

    if (FEE_COLLECTOR_SUPPORTED_TOKENS?.[1]) {
      promises.push(refetchUsdt())
    }

    await Promise.all(promises)
  }

  return {
    isFeeCollectorOwner,
    nativeBalance,
    usdcBalance,
    usdtBalance,
    tokens,
    totalUSD,
    isLoading,
    isLoadingNativeBalance,
    isLoadingUsdc,
    isLoadingUsdt,
    isLoadingPrices,
    errorNative,
    errorUsdc,
    errorUsdt,
    refetchNative,
    refetchUsdc,
    refetchUsdt,
    refetchAll
  }
}
