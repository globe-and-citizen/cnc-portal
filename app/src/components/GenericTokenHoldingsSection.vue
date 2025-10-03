<!-- TokenHoldingsSection.vue -->
<template>
  <CardComponent title="Token Holding">
    <TableComponent
      :rows="
        balances.map((balance, index) => ({
          ...balance,
          rank: index + 1,
          icon:
            balance.token.symbol === 'USDC'
              ? USDCIcon
              : balance.token.symbol === 'POL'
                ? MaticIcon
                : balance.token.symbol === 'ETH'
                  ? EthereumIcon
                  : null
        }))
      "
      :loading="isLoading"
      :columns="[
        { key: 'rank', label: 'RANK' },
        { key: 'token', label: 'Token', sortable: true, class: 'min-w-32' },
        { key: 'amount', label: 'Amount', sortable: true, class: 'min-w-32' },
        { key: 'price', label: 'Coin Price', sortable: true, class: 'min-w-40' },
        { key: 'balance', label: 'Balance', sortable: true, class: 'min-w-32' }
      ]"
    >
      <template #amount-data="{ row }"> {{ row.amount }} {{ row.token.symbol }} </template>
      <template #price-data="{ row }">
        {{ row.values[currency.code ?? 'USD']?.formatedPrice }} / {{ row.token.symbol }}
      </template>

      <template #balance-data="{ row }">
        {{ row.values[currency.code ?? 'USD']?.formated }}
      </template>

      <template #token-data="{ row }">
        <div class="flex items-center gap-2 lg:w-48">
          <img v-if="row.icon" :src="row.icon" :alt="row.name" class="w-8 h-8 rounded-full" />
          <div v-else class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
            <span class="text-gray-500">{{ row.token.name.charAt(0) }}</span>
          </div>
          <div class="flex flex-col">
            <div class="font-medium">{{ row.name }}</div>
            <div class="text-sm text-gray-500">{{ row.network }}</div>
          </div>
        </div>
      </template>
    </TableComponent>
  </CardComponent>
</template>

<script setup lang="ts">
import TableComponent from '@/components/TableComponent.vue'
import CardComponent from '@/components/CardComponent.vue'
import EthereumIcon from '@/assets/Ethereum.png'
import USDCIcon from '@/assets/usdc.png'
import MaticIcon from '@/assets/matic-logo.png'
import { useContractBalance } from '@/composables'
import { useStorage } from '@vueuse/core'
import type { Address } from 'viem'

const props = defineProps<{
  address: Address
}>()

// const teamStore = useTeamStore()
// const currencyStore = useCurrencyStore()

const currency = useStorage('currency', {
  code: 'USD',
  name: 'US Dollar',
  symbol: '$'
})
// Reactive state for balances: composable that fetches address balances
const { balances, isLoading } = useContractBalance(props.address as Address)
</script>
