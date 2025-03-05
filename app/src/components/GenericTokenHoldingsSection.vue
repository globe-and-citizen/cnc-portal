<!-- TokenHoldingsSection.vue -->
<template>
  <CardComponent title="Token Holding" class="mb-8">
    <TableComponent
      :rows="tokensWithRank"
      :loading="pricesLoading"
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
      <template #price-data="{ row }"> ${{ row.price }} </template>
      <template #balance-data="{ row }"> ${{ row.balance }} </template>
    </TableComponent>
  </CardComponent>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import TableComponent from '@/components/TableComponent.vue'
import CardComponent from '@/components/CardComponent.vue'
import { NETWORK } from '@/constant'
import EthereumIcon from '@/assets/Ethereum.png'
import USDCIcon from '@/assets/usdc.png'
import { useCryptoPrice } from '@/composables/useCryptoPrice'
import { log, parseError } from '@/utils'
// import { useCurrencyRates } from '@/composables/useCurrencyRates'

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

// interface BankBalanceSection {
//   teamBalance?: {
//     formatted?: string
//   }
//   formattedUsdcBalance?: string
// }

const props = defineProps<{
  // bankBalanceSection: BankBalanceSection
  networkCurrencyBalance: string 
  usdcBalance: string
  /*priceData: {
    networkCurrencyPrice: number
    usdcPrice: number
    loading: boolean
    error: boolean | null
  }*/
}>()

// Map network currency symbol to CoinGecko ID - always use ethereum price for testnets
const networkCurrencyId = computed(() => {
  // Always use ethereum price for testnets
  return 'ethereum'
})

const {
  prices,
  loading: pricesLoading,
  error: pricesError
} = useCryptoPrice([networkCurrencyId.value, 'usd-coin'])

// Computed properties for prices
const networkCurrencyPrice = computed(() => prices.value[networkCurrencyId.value]?.usd || 0)

const usdcPrice = computed(
  () => prices.value['usd-coin']?.usd || 1 // Default to 1 since USDC is a stablecoin
)

const tokens = computed(() => [
  {
    name: NETWORK.currencySymbol,
    network: NETWORK.currencySymbol,
    price: networkCurrencyPrice.value,
    balance: props.networkCurrencyBalance
      ? Number(props.networkCurrencyBalance) *
        networkCurrencyPrice.value
      : 0,
    amount: props.networkCurrencyBalance
      ? Number(props.networkCurrencyBalance)
      : 0,
    icon: EthereumIcon
  },
  {
    name: 'USDC',
    network: 'USDC',
    price: usdcPrice.value,
    balance: props.usdcBalance
      ? Number(props.usdcBalance) * usdcPrice.value
      : 0,
    amount: props.usdcBalance
      ? Number(props.usdcBalance)
      : 0,
    icon: USDCIcon
  }
])

const tokensWithRank = computed<TokenWithRank[]>(() =>
  tokens.value.map((token, index) => ({
    ...token,
    price: token.price.toFixed(2),
    balance: token.balance.toFixed(2),
    amount: token.amount.toFixed(2),
    rank: index + 1
  }))
)

watch(pricesError, newError => {
  if (newError) {
    log.error('priceError.value', parseError(newError))
  }
})
</script>
