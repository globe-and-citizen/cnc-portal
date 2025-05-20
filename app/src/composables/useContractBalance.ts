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
  } = useReadContract({
    address: USDC_ADDRESS as Address,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: [address as Address],
    query: {
      refetchInterval: 60000
    }
  })

  // Combined loading and error states
  const isLoading = computed(() => isLoadingNative.value || isLoadingUsdc.value)
  const error = computed(() => nativeError.value || usdcError.value)

  // Computed balances with formatted values
  const newBalance = computed<Array<Balance>>(() => {
    const nativeAmount = nativeBalance.value ? Number(formatEther(nativeBalance.value.value)) : 0
    const usdcAmount = usdcBalance.value ? Number(usdcBalance.value) / 1e6 : 0

    // Function to calculate value in USD and format it in a short printable way
    const getValue = (amount: number, price: number, local: boolean = false) => {
      const value = Number((amount * (price || 0)).toFixed(2))
      return {
        value,
        formated: formatCurrencyShort(value, local ? currencyStore.localCurrency.code : undefined)
      }
    }

    return [
      {
        amount: nativeAmount,
        code: nativeBalance.value?.symbol || 'ETH',
        valueInUSD: getValue(nativeAmount, currencyStore.nativeToken.priceInUSD ?? 0),
        valueInLocalCurrency: getValue(
          nativeAmount,
          currencyStore.nativeToken.priceInLocal ?? 0,
          true
        )
      },
      {
        amount: usdcAmount,
        code: 'USDC',
        valueInUSD: getValue(usdcAmount, currencyStore.usdc.priceInUSD ?? 0),
        valueInLocalCurrency: getValue(usdcAmount, currencyStore.usdc.priceInLocal ?? 0, true)
      }
    ]
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
