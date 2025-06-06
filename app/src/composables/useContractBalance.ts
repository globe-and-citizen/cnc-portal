import { computed } from 'vue'
import { useBalance, useReadContract, useChainId } from '@wagmi/vue'
import { formatEther, formatUnits, type Address } from 'viem'
import ERC20ABI from '@/artifacts/abi/erc20.json'
import { useCurrencyStore } from '@/stores/currencyStore'
import { SUPPORTED_TOKENS, USDC_ADDRESS } from '@/constant'
import type { TokenId } from '@/constant'
import { formatCurrencyShort } from '@/utils/currencyUtil'

interface TokenBalance {
  code: string
  amount: number
  valueInUSD: {
    value: number
    formated: string
  }
  valueInLocalCurrency: {
    value: number
    formated: string
  }
}

export function useContractBalance(address: Address | undefined) {
  const chainId = useChainId()
  const currencyStore = useCurrencyStore()

  // Store for all token balances
  const tokenBalances = SUPPORTED_TOKENS.map((token) => {
    if (token.id === 'native') {
      // Native token (ETH, MATIC, etc)
      const native = useBalance({
        address,
        chainId,
        query: { refetchInterval: 60000 }
      })
      return {
        token,
        data: native.data,
        isLoading: native.isLoading,
        error: native.error,
        isNative: true
      }
    } else {
      // ERC20 token
      const erc20 = useReadContract({
        address: token.symbol === 'USDC' ? (USDC_ADDRESS as Address) : (token.address as Address),
        abi: ERC20ABI,
        functionName: 'balanceOf',
        args: [address as Address],
        query: { refetchInterval: 60000 }
      })
      return {
        token,
        data: erc20.data,
        isLoading: erc20.isLoading,
        error: erc20.error,
        isNative: false
      }
    }
  })

  // Computed balances for all tokens
  const balances = computed<TokenBalance[]>(() => {
    return tokenBalances.map(({ token, data, isNative }) => {
      let amount = 0
      if (data.value) {
        if (isNative) {
          amount = Number(formatEther(data.value.value))
        } else {
          amount = Number(formatUnits(data.value, token.decimals))
        }
      }
      // Use getTokenInfo for price info
      const info = currencyStore.getTokenInfo(token.id as TokenId)
      const local = info?.prices.find((p) => p.id === 'local')
      const usd = info?.prices.find((p) => p.id === 'usd')
      return {
        amount,
        code: token.symbol,
        valueInUSD: {
          value: usd?.price ?? 0,
          formated: formatCurrencyShort(usd?.price ?? 0)
        },
        valueInLocalCurrency: {
          value: local?.price ?? 0,
          formated: formatCurrencyShort(local?.price ?? 0, local?.code)
        }
      }
    })
  })

  // Computed total balance in USD and local currency
  const total = computed(() => {
    const usdValue = Number(
      balances.value.reduce((acc, balance) => acc + balance.valueInUSD.value, 0).toFixed(2)
    )
    const localValue = Number(
      balances.value
        .reduce((acc, balance) => acc + balance.valueInLocalCurrency.value, 0)
        .toFixed(2)
    )
    return {
      usdBalance: {
        value: usdValue,
        formated: formatCurrencyShort(usdValue)
      },
      localCurrencyBalance: {
        value: localValue,
        formated: formatCurrencyShort(localValue, currencyStore.localCurrency.code)
      }
    }
  })

  // Combined loading and error states
  const isLoading = computed(() => tokenBalances.some((tb) => tb.isLoading.value))
  const error = computed(() => tokenBalances.find((tb) => tb.error.value)?.error.value || null)

  return {
    balances,
    total,
    isLoading,
    error
  }
}
