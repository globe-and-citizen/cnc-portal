import { computed, watch } from 'vue'
import { useBalance, useReadContract, useChainId } from '@wagmi/vue'
import { formatEther, type Address } from 'viem'
import { USDC_ADDRESS } from '@/constant'
import ERC20ABI from '@/artifacts/abi/erc20.json'
import { useCurrencyStore } from '@/stores/currencyStore'

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
  valueInUSD: number
  valueInLocalCurrency: number
}

export function useContractBalance(address: Address | undefined) {
  const chainId = useChainId()
  const currencyStore = useCurrencyStore()

  const {
    data: nativeBalance,
    isLoading: isLoadingNative,
    error: nativeError
    // refetch: fetchNativeBalance
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

  // const formattedNativeBalance = computed(() =>
  //   nativeBalance.value ? formatEther(nativeBalance.value.value) : '0'
  // )

  // const formattedUsdcBalance = computed(() =>
  //   usdcBalance.value ? (Number(usdcBalance.value) / 1e6).toString() : '0'
  // )

  // const totalValueUSD = computed(() => {
  //   const nativeValue =
  //     Number(formattedNativeBalance.value) * (currencyStore.nativeToken.priceInUSD || 0)
  //   const usdcValue = Number(formattedUsdcBalance.value)
  //   return (nativeValue + usdcValue).toFixed(2)
  // })

  // const totalValueInLocalCurrency = computed(() => {
  //   const nativeValue =
  //     Number(formattedNativeBalance.value) * (currencyStore.nativeToken.priceInLocal || 0)
  //   const usdcValue = Number(formattedUsdcBalance.value) * (currencyStore.usdc.priceInLocal || 0)
  //   return (nativeValue + usdcValue).toFixed(2)
  // })

  const isLoading = computed(() => isLoadingNative.value || isLoadingUsdc.value)

  const error = computed(() => nativeError.value || usdcError.value)

  // const refetch = async () => {
  //   try {
  //     await Promise.all([fetchNativeBalance(), fetchUsdcBalance()])
  //   } catch (err) {
  //     console.error('Error refetching balances:', err)
  //   }
  // }
  const newBalance = computed<Array<Balance>>(() => {
    const nativeAmount = nativeBalance.value ? Number(formatEther(nativeBalance.value.value)) : 0
    const usdcAmount = usdcBalance.value ? Number(usdcBalance.value) / 1e6 : 0
    const tab = [
      {
        amount: nativeAmount,
        code: nativeBalance.value?.symbol || 'ETH',
        valueInUSD: Number((nativeAmount * (currencyStore.nativeToken.priceInUSD || 0)).toFixed(2)),
        valueInLocalCurrency: Number(
          (nativeAmount * (currencyStore.nativeToken.priceInLocal || 0)).toFixed(2)
        )
      },
      {
        amount: usdcBalance.value ? Number(usdcBalance.value) / 1e6 : 0,
        code: 'USDC',
        valueInUSD: Number((usdcAmount * (currencyStore.usdc.priceInUSD || 0)).toFixed(2)),
        valueInLocalCurrency: Number(
          (usdcAmount * (currencyStore.usdc.priceInLocal || 0)).toFixed(2)
        )
      }
    ]
    // console.log('comuted newBalance')
    // console.log('newBalance', tab)
    return tab
  })

  // watch(
  //   newBalance,
  //   () => {
  //     console.log('newBalance Value', newBalance.value)
  //   },
  //   { deep: true }
  // )
  // watch(usdcBalance, () => {
  //   console.log('usdcBalance Value', usdcBalance.value)
  // })

  // watch(nativeBalance, () => {
  //   console.log('nativeBalance Value', nativeBalance.value)
  // })
  // const balances = reactive({
  //   nativeToken: {
  //     balance: computed(() => nativeBalance.value?.value),
  //     formatted: computed(() => formattedNativeBalance.value)
  //   },
  //   usdc: {
  //     balance: computed(() => usdcBalance.value),
  //     formatted: computed(() => formattedUsdcBalance.value)
  //   },
  //   totalValueUSD: computed(() => totalValueUSD.value),
  //   totalValueInLocalCurrency: computed(() => totalValueInLocalCurrency.value)
  // })

  return {
    balances: newBalance,
    total: computed(() => {
      return {
        usdBalance: Number(
          newBalance.value
            .reduce((acc, balance) => {
              return acc + (balance.valueInUSD || 0)
            }, 0)
            .toFixed(2)
        ),
        localCurrencyBalance: Number(
          newBalance.value
            .reduce((acc, balance) => {
              return acc + (balance.valueInLocalCurrency || 0)
            }, 0)
            .toFixed(2)
        )
      }
    }),
    isLoading,
    error
    // refetch
  }
}
