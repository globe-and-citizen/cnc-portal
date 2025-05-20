import { computed } from 'vue'
import { useBalance, useReadContract, useChainId } from '@wagmi/vue'
import { formatEther, type Address } from 'viem'
import { USDC_ADDRESS } from '@/constant'
import ERC20ABI from '@/artifacts/abi/erc20.json'
import { useCurrencyStore } from '@/stores/currencyStore'
import { formatCurrencyShort } from '@/utils/currencyUtil'

export interface ContractBalance {
  nativeToken: {
    balance: string
    formatted: string
  }
  usdc: {
    balance: string
    formatted: string
  }
  totalValueUSD: string
  isLoading: boolean
  error: Error | null
}

interface Balance {
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

  const {
    data: nativeBalance,
    isLoading: isLoadingNative,
    error: nativeError
  } = useBalance({
    address,
    chainId,
    query: {
      refetchInterval: 60000
    }
  })

  const {
    data: usdcBalance,
    isLoading: isLoadingUsdc,
    error: usdcError
    // refetch: fetchUsdcBalance
  } = useReadContract({
    address: USDC_ADDRESS as Address,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: [address as Address],
    query: {
      refetchInterval: 60000
    }
  })

  const isLoading = computed(() => isLoadingNative.value || isLoadingUsdc.value)

  const error = computed(() => nativeError.value || usdcError.value)

  const newBalance = computed<Array<Balance>>(() => {
    const nativeAmount = nativeBalance.value ? Number(formatEther(nativeBalance.value.value)) : 0
    const usdcAmount = usdcBalance.value ? Number(usdcBalance.value) / 1e6 : 0
    const tab = [
      {
        amount: nativeAmount,
        code: nativeBalance.value?.symbol || 'ETH',
        valueInUSD: {
          value: Number((nativeAmount * (currencyStore.nativeToken.priceInUSD || 0)).toFixed(2)),
          formated: formatCurrencyShort(
            Number((nativeAmount * (currencyStore.nativeToken.priceInUSD || 0)).toFixed(2))
          )
        },
        valueInLocalCurrency: {
          value: Number((nativeAmount * (currencyStore.nativeToken.priceInLocal || 0)).toFixed(2)),
          formated: formatCurrencyShort(
            Number((nativeAmount * (currencyStore.nativeToken.priceInLocal || 0)).toFixed(2)),
            currencyStore.localCurrency.code
          )
        }
      },
      {
        amount: usdcAmount,
        code: 'USDC',
        valueInUSD: {
          value: Number((usdcAmount * (currencyStore.usdc.priceInUSD || 0)).toFixed(2)),
          formated: formatCurrencyShort(
            Number((usdcAmount * (currencyStore.usdc.priceInUSD || 0)).toFixed(2))
          )
        },
        valueInLocalCurrency: {
          value: Number((usdcAmount * (currencyStore.usdc.priceInLocal || 0)).toFixed(2)),
          formated: formatCurrencyShort(
            Number((usdcAmount * (currencyStore.usdc.priceInLocal || 0)).toFixed(2)),
            currencyStore.localCurrency.code
          )
        }
      }
    ]
    return tab
  })

  return {
    balances: newBalance,
    total: computed(() => {
      return {
        usdBalance: Number(
          newBalance.value
            .reduce((acc, balance) => {
              return acc + (balance.valueInUSD.value || 0)
            }, 0)
            .toFixed(2)
        ),
        localCurrencyBalance: Number(
          newBalance.value
            .reduce((acc, balance) => {
              return acc + (balance.valueInLocalCurrency.value || 0)
            }, 0)
            .toFixed(2)
        )
      }
    }),
    isLoading,
    error
  }
}
