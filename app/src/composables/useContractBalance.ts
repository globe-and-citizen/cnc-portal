import { computed } from 'vue'
import { useBalance, useReadContract, useChainId } from '@wagmi/vue'
import { formatEther, formatUnits, type Address } from 'viem'
import ERC20ABI from '@/artifacts/abi/erc20.json'
import { useCurrencyStore } from '@/stores/currencyStore'
import { LIST_CURRENCIES, SUPPORTED_TOKENS } from '@/constant'
import type { TokenId } from '@/constant'
import type { Currency } from '@/constant'
import { formatCurrencyShort } from '@/utils/currencyUtil'

// Extracted value type for balances
export type TokenBalanceValue = {
  value: number
  formated: string
  id: string
  code: string
  symbol: string
  price: number | null
}

interface TokenBalance {
  code: string
  amount: number
  token: (typeof SUPPORTED_TOKENS)[number]
  values: Record<string, TokenBalanceValue>
}

export function useContractBalance(address: Address) {
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
        address: token.address,
        abi: ERC20ABI,
        functionName: 'balanceOf',
        args: [address],
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
      // token balance lenght
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
      const values: Record<string, TokenBalanceValue> = {}
      if (info?.prices) {
        for (const price of info.prices) {
          const val = amount * (price.price ?? 0)
          values[price.code] = {
            value: val,
            formated: formatCurrencyShort(val, price.code),
            ...price
          }
        }
      }
      return {
        amount,
        code: token.symbol,
        token,
        values
      }
    })
  })

  // Computed total balance for each currency
  const total = computed(() => {
    const totals: Record<string, { value: number; formated: string }> = {}
    if (balances.value.length > 0) {
      // Collect all currency codes from the first token (assuming all tokens have the same set)
      const allCodes = Object.keys(balances.value[0].values)
      for (const code of allCodes) {
        const sum = balances.value.reduce((acc, bal) => acc + (bal.values[code]?.value ?? 0), 0)
        totals[code] = {
          value: sum,
          formated: formatCurrencyShort(sum, code)
        }
      }
    }
    return totals
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
