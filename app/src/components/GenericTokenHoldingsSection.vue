<!-- TokenHoldingsSection.vue -->
<template>
  <CardComponent title="Token Holding">
    <TableComponent
      :rows="tokensWithRank"
      :loading="pricesLoading || isLoadingNetworkCuerrencyBalance || isLoadingUsdcBalance"
      :columns="[
        { key: 'rank', label: 'RANK' },
        { key: 'token', label: 'Token', sortable: true },
        { key: 'amount', label: 'Amount', sortable: true },
        { key: 'price', label: 'Coin Price', sortable: true },
        { key: 'balance', label: 'Balance', sortable: true }
      ]"
    >
      <template #token-data="{ row }">
        <div class="flex items-center gap-2">
          <img :src="row.icon" :alt="row.name" class="w-8 h-8 rounded-full" />
          <div class="flex flex-col">
            <div class="font-medium">{{ row.name }}</div>
            <div class="text-sm text-gray-500">{{ row.network }}</div>
          </div>
        </div>
      </template>
      <template #rank-data="{ row }">
        {{ row.rank }}
      </template>
      <template #price-data="{ row }">
        {{ currencyStore.currency.symbol }}{{ row.price }}
      </template>
      <template #balance-data="{ row }">
        {{ currencyStore.currency.symbol }}{{ row.balance }}
      </template>
    </TableComponent>
  </CardComponent>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import TableComponent from '@/components/TableComponent.vue'
import CardComponent from '@/components/CardComponent.vue'
import { NETWORK, USDC_ADDRESS } from '@/constant'
import EthereumIcon from '@/assets/Ethereum.png'
import USDCIcon from '@/assets/usdc.png'
import { useCryptoPrice } from '@/composables/useCryptoPrice'
import { log, parseError } from '@/utils'
import { useBalance, useChainId, useReadContract } from '@wagmi/vue'
import { formatEther, type Address } from 'viem'
import ERC20ABI from '@/artifacts/abi/erc20.json'
import { useCurrencyStore } from '@/stores/currencyStore'

interface Token {
  name: string
  network: string
  price: number | string
  balance: number | string
  amount: number | string
  icon: string
}

interface TokenWithRank extends Token {
  rank: number
  price: string
  balance: string
  amount: string
}

const props = defineProps<{
  address: string
}>()

const currencyStore = useCurrencyStore()

// Map network currency symbol to CoinGecko ID - always use ethereum price for testnets
const networkCurrencyId = computed(() => {
  // Always use ethereum price for testnets
  return 'ethereum'
})

const chainId = useChainId()

const {
  prices,
  loading: pricesLoading,
  error: pricesError
} = useCryptoPrice([networkCurrencyId.value, 'usd-coin'])

const {
  data: networkCurrencyBalance,
  isLoading: isLoadingNetworkCuerrencyBalance,
  error: networkCurrencyBalanceError,
  refetch: refetchNetworkCurrencyBalance
} = useBalance({
  address: props.address as unknown as Address,
  chainId
})

// Token balances
const {
  data: usdcBalance,
  isLoading: isLoadingUsdcBalance,
  refetch: refetchUsdcBalance,
  error: usdcBalanceError
} = useReadContract({
  address: USDC_ADDRESS as Address,
  abi: ERC20ABI,
  functionName: 'balanceOf',
  args: [props.address as unknown as Address]
})

// Computed properties for prices
const networkCurrencyPrice = computed(() => {
  const usdPrice = prices.value[networkCurrencyId.value]?.usd || 0
  if (currencyStore.currency.code === 'USD') return usdPrice
  const rate = currencyStore.getRate(currencyStore.currency.code)
  return usdPrice * rate
})

const usdcPrice = computed(() => {
  const usdPrice = prices.value['usd-coin']?.usd || 1 // Default to 1 since USDC is a stablecoin
  if (currencyStore.currency.code === 'USD') return usdPrice
  const rate = currencyStore.getRate(currencyStore.currency.code)
  return usdPrice * rate
})

const tokens = computed(() => [
  {
    name: NETWORK.currencySymbol,
    network: NETWORK.currencySymbol,
    price: networkCurrencyPrice.value,
    balance: Number(formattedNetworkCurrencyBalance.value) * networkCurrencyPrice.value,
    amount: Number(formattedNetworkCurrencyBalance.value),
    icon: EthereumIcon
  },
  {
    name: 'USDC',
    network: 'USDC',
    price: usdcPrice.value,
    balance: Number(formattedUsdcBalance.value) * usdcPrice.value,
    amount: Number(formattedUsdcBalance.value),
    icon: USDCIcon
  }
])

const formattedNetworkCurrencyBalance = computed(() =>
  networkCurrencyBalance.value?.value ? formatEther(networkCurrencyBalance.value.value) : `0`
)

const formattedUsdcBalance = computed(() =>
  usdcBalance.value ? Number(usdcBalance.value) / 1e6 : `0`
)

const tokensWithRank = computed<TokenWithRank[]>(() =>
  tokens.value.map((token, index) => ({
    ...token,
    price: token.price.toFixed(2),
    balance: token.balance.toFixed(2),
    amount: token.amount.toFixed(3),
    rank: index + 1
  }))
)

watch(pricesError, (newError) => {
  if (newError) {
    log.error('priceError.value', parseError(newError))
  }
})

watch(networkCurrencyBalanceError, (newError) => {
  if (newError) {
    log.error('networkCurrencyBalanceError.value', parseError(newError))
  }
})

watch(usdcBalanceError, (newError) => {
  if (newError) {
    log.error('usdcBalanceError.value', parseError(newError))
  }
})

onMounted(async () => {
  await refetchNetworkCurrencyBalance()
  await refetchUsdcBalance()
})
</script>
