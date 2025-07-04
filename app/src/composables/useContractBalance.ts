import { computed, unref, type Ref } from 'vue'
import { useBalance, useReadContract, useChainId } from '@wagmi/vue'
import { formatEther, formatUnits, type Address } from 'viem'
import ERC20ABI from '@/artifacts/abi/erc20.json'
import { useCurrencyStore, useTeamStore } from '@/stores'
import { SUPPORTED_TOKENS } from '@/constant'
import type { TokenId } from '@/constant'
import { formatCurrencyShort } from '@/utils/currencyUtil'

/**
 * @description Represents the value of a token balance in a specific currency
 * @param value - The numeric value of the token balance in the given currency
 * @param formated - The formatted value for display, e.g. "$1,234.56"
 * @param id - Unique identifier for the currency
 * @param code - The currency code, e.g. "USD", "EUR"
 * @param symbol - The currency symbol, e.g. "$", "€"
 * @param price - The price of the token in the given currency
 * @param formatedPrice - The formatted price for display, e.g. "$1,234.56"
 * @description This type is used to represent the value of a token balance in different currencies
 * and is returned by the useContractBalance composable.
 * It includes the raw value, formatted value, currency ID, code, symbol, and price information.
 */
export type TokenBalanceValue = {
  value: number
  formated: string
  id: string
  code: string
  symbol: string
  price: number
  formatedPrice: string
}

/**
 * @description Represents a token balance for a specific address
 * @param amount - The numeric amount of the token balance
 * @param token - The token configuration object, including ID, name, symbol, etc.
 * @param values - An object mapping currency codes to TokenBalanceValue objects,
 */
interface TokenBalance {
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

// TODO: support reactive address changes
/**
 * @description Composable to fetch and compute balances for an address
 *
 * Supports both native and ERC20 tokens
 */
export function useContractBalance(address: Address | Ref<Address | undefined>) {
  const chainId = useChainId()
  const currencyStore = useCurrencyStore()
  const teamStore = useTeamStore()

  const supportedToken = computed(() => {
    const tokens = [...SUPPORTED_TOKENS]
    if (teamStore.getContractAddressByType('InvestorsV1') && !tokens.some((t) => t.id === 'sher')) {
      tokens.push({
        id: 'sher',
        name: 'Sher Token',
        symbol: 'SHER',
        code: 'SHER',
        coingeckoId: 'sher-token',
        decimals: 18,
        address: teamStore.getContractAddressByType('SHER') as Address
      })
    }
    return tokens
  })

  // Store for all token balances
  const tokenBalances: TokenBalanceEntry[] = supportedToken.value.map((token) => {
    if (token.id === 'native') {
      const native = useBalance({
        address: unref(address),
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
        args: [unref(address)],
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
            price: price.price ?? 0,
            formatedPrice: price.price ? formatCurrencyShort(price.price, price.code) : 'N/A'
          }
        }
      }
      return {
        amount,
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
      for (const code of allCodes) {
        const first = balances.value[0].values[code]
        const sum = balances.value.reduce((acc, bal) => acc + (bal.values[code]?.value ?? 0), 0)
        totals[code] = {
          value: sum,
          formated: formatCurrencyShort(sum, code),
          id: first.id,
          code: first.code,
          symbol: first.symbol,
          price: first.price,
          formatedPrice: formatCurrencyShort(first.price, code)
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
