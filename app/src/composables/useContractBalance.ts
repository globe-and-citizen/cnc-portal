import { computed, reactive, ref } from 'vue'
import { useBalance, useReadContract, useChainId } from '@wagmi/vue'
import { formatEther, type Address } from 'viem'
import { USDC_ADDRESS } from '@/constant'
import ERC20ABI from '@/artifacts/abi/erc20.json'
import { useCurrencyStore } from '@/stores/currencyStore'

export interface TokenBalance {
  address: Address | 'native'
  symbol: string
  name: string
  icon?: string
  balance: string
  rawBalance: bigint | null
  priceUSD: number
  valueUSD: number
  decimals: number
  isNative: boolean
}

export function useContractBalance(
  address: Address | undefined,
  options?: {
    tokens?: Array<{
      address: Address
      symbol: string
      name: string
      icon?: string
      decimals?: number
    }>
  }
) {
  const chainId = useChainId()
  const currencyStore = useCurrencyStore()

  // Native token
  const {
    data: nativeBalance,
    isLoading: isLoadingNative,
    error: nativeError,
    refetch: fetchNativeBalance
  } = useBalance({
    address,
    chainId
  })

  // ERC20 tokens
  const tokens = options?.tokens || []
  const erc20Balances = tokens.map((token) => {
    const {
      data: tokenBalance,
      isLoading: isLoadingToken,
      error: tokenError,
      refetch: fetchTokenBalance
    } = useReadContract({
      address: token.address,
      abi: ERC20ABI,
      functionName: 'balanceOf',
      args: [address as Address]
    })
    return {
      ...token,
      tokenBalance,
      isLoadingToken,
      tokenError,
      fetchTokenBalance
    }
  })

  // Compose balances array
  const balances = computed<TokenBalance[]>(() => {
    const arr: TokenBalance[] = []
    // Native
    const nativeRaw = nativeBalance.value?.value ?? null
    const nativePrice = currencyStore.nativeTokenPriceInUSD || 0
    const nativeDecimals = 18
    arr.push({
      address: 'native',
      symbol: NETWORK.currencySymbol,
      name: NETWORK.currencySymbol,
      icon: undefined,
      balance: nativeRaw ? formatEther(nativeRaw) : '0',
      rawBalance: nativeRaw,
      priceUSD: nativePrice,
      valueUSD: nativeRaw ? Number(formatEther(nativeRaw)) * nativePrice : 0,
      decimals: nativeDecimals,
      isNative: true
    })
    // ERC20s
    for (const t of erc20Balances) {
      const decimals = t.decimals ?? 6
      const raw = t.tokenBalance.value ?? null
      const price = currencyStore.getTokenPriceUSD?.(t.address) ?? 0
      arr.push({
        address: t.address,
        symbol: t.symbol,
        name: t.name,
        icon: t.icon,
        balance: raw ? (Number(raw) / 10 ** decimals).toString() : '0',
        rawBalance: raw,
        priceUSD: price,
        valueUSD: raw ? (Number(raw) / 10 ** decimals) * price : 0,
        decimals,
        isNative: false
      })
    }
    return arr
  })

  const totalValueUSD = computed(() =>
    balances.value.reduce((sum, t) => sum + t.valueUSD, 0).toFixed(2)
  )

  const isLoading = computed(
    () => isLoadingNative.value || erc20Balances.some((t) => t.isLoadingToken.value)
  )
  const error = computed(
    () => nativeError.value || erc20Balances.find((t) => t.tokenError.value)?.tokenError.value
  )

  const refetch = async () => {
    try {
      await Promise.all([
        fetchNativeBalance(),
        ...erc20Balances.map((t) => t.fetchTokenBalance())
      ])
    } catch (err) {
      console.error('Error refetching balances:', err)
    }
  }

  return {
    balances,
    totalValueUSD,
    isLoading,
    error,
    refetch
  }
}
