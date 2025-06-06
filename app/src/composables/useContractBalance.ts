import { computed } from 'vue'
import { useBalance, useReadContract, useChainId } from '@wagmi/vue'
import { formatEther, formatUnits, type Address } from 'viem'
import ERC20ABI from '@/artifacts/abi/erc20.json'
import { useCurrencyStore } from '@/stores/currencyStore'
import { SUPPORTED_TOKENS } from '@/constant'
import type { TokenId } from '@/constant'
import { formatCurrencyShort } from '@/utils/currencyUtil'

export type TokenBalanceValue = {
  value: number
  formated: string
  id: string
  code: string
  symbol: string
  price: number
}

interface TokenBalance {
  code: string
  amount: number
  token: (typeof SUPPORTED_TOKENS)[number]
  values: Record<string, TokenBalanceValue>
}

type NativeTokenBalanceEntry = {
  token: (typeof SUPPORTED_TOKENS)[number]
  data: { value?: { value: bigint } }
  isLoading: { value: boolean }
  error: { value: unknown }
  isNative: true
}
type ERC20TokenBalanceEntry = {
  token: (typeof SUPPORTED_TOKENS)[number]
  data: { value?: bigint }
  isLoading: { value: boolean }
  error: { value: unknown }
  isNative: false
}
type TokenBalanceEntry = NativeTokenBalanceEntry | ERC20TokenBalanceEntry

export function useContractBalance(address: Address) {
  const chainId = useChainId()
  const currencyStore = useCurrencyStore()

  // Store for all token balances
  const tokenBalances: TokenBalanceEntry[] = SUPPORTED_TOKENS.map((token) => {
    if (token.id === 'native') {
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
      } as NativeTokenBalanceEntry
    } else {
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
      } as ERC20TokenBalanceEntry
    }
  })

  // Computed balances for all tokens
  const balances = computed<TokenBalance[]>(() => {
    return tokenBalances.map(({ token, data, isNative }) => {
      let amount = 0
      if (data.value) {
        if (isNative) {
          amount = Number(formatEther((data.value as { value: bigint }).value))
        } else {
          amount = Number(formatUnits(data.value as bigint, token.decimals))
        }
      }
      const info = currencyStore.getTokenInfo(token.id as TokenId)
      const values: Record<string, TokenBalanceValue> = {}
      if (info?.prices) {
        for (const price of info.prices) {
          const val = amount * (price.price ?? 0)
          values[price.code] = {
            value: val,
            formated: formatCurrencyShort(val, price.code),
            id: price.id,
            code: price.code,
            symbol: price.symbol,
            price: price.price ?? 0
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
  const total = computed<Record<string, TokenBalanceValue>>(() => {
    const totals: Record<string, TokenBalanceValue> = {}
    if (balances.value.length > 0) {
      const allCodes = Object.keys(balances.value[0].values)
      console.log('All codes:', allCodes)
      for (const code of allCodes) {
        const first = balances.value[0].values[code]
        const sum = balances.value.reduce((acc, bal) => acc + (bal.values[code]?.value ?? 0), 0)
        totals[code] = {
          value: sum,
          formated: formatCurrencyShort(sum, code),
          id: first.id,
          code: first.code,
          symbol: first.symbol,
          price: first.price
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
