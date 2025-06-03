<!-- TokenHoldingsSection.vue -->
<template>
  <CardComponent title="Token Holding">
    <TableComponent
      :rows="tokensWithRank"
      :loading="loading"
      :columns="[
        { key: 'rank', label: 'RANK' },
        { key: 'token', label: 'Token', sortable: true, class: 'min-w-32' },
        { key: 'amount', label: 'Amount', sortable: true, class: 'min-w-32' },
        { key: 'price', label: 'Coin Price', sortable: true, class: 'min-w-40' },
        { key: 'balance', label: 'Balance', sortable: true, class: 'min-w-32' }
      ]"
    >
      <template #token-data="{ row }">
        <div class="flex items-center gap-2 lg:w-48">
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
      <template #amount-data="{ row }"> {{ row.amount }} {{ row.network }} </template>
      <template #price-data="{ row }"> {{ row.price }} / {{ row.network }} </template>
      <template #balance-data="{ row }">
        {{ row.balance }}
      </template>
    </TableComponent>
  </CardComponent>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import TableComponent from '@/components/TableComponent.vue'
import CardComponent from '@/components/CardComponent.vue'
import { NETWORK, USDC_ADDRESS } from '@/constant'
import EthereumIcon from '@/assets/Ethereum.png'
import USDCIcon from '@/assets/usdc.png'
import MaticIcon from '@/assets/matic-logo.png'
import { log, parseError } from '@/utils'
import { useChainId } from '@wagmi/vue'
import { type Address } from 'viem'
import { useCurrencyStore } from '@/stores/currencyStore'
import { useContractBalance } from '@/composables/useContractBalance'

const props = defineProps<{
  address: string
}>()

const currencyStore = useCurrencyStore()

const chainId = useChainId()

const tokenList = [
  {
    address: USDC_ADDRESS as Address,
    symbol: 'USDC',
    name: 'USDC',
    icon: USDCIcon,
    decimals: 6
  }
  // Add more tokens here if needed
]

const { balances, totalValueUSD, isLoading, error, refetch } = useContractBalance(
  props.address as Address,
  { tokens: tokenList }
)

const networkIcon = computed(() => {
  if (Number(NETWORK.chainId) === 137) return MaticIcon
  return EthereumIcon
})
const tokensWithRank = computed(() =>
  balances.value.map((token, index) => ({
    rank: index + 1,
    name: token.name,
    network: token.symbol,
    price: Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyStore.currency.code
    }).format(token.priceUSD),
    balance: Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyStore.currency.code
    }).format(token.valueUSD),
    amount: Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(Number(token.balance)),
    icon: token.icon
  }))
)

// Replace old loading logic
const loading = computed(() => currencyStore.isLoading || isLoading.value || currencyStore.isLoadingUSDPrice)

// Remove old balance/watch/onMounted logic
</script>
