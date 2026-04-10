<!-- TokenHoldingsSection.vue -->
<template>
  <UCard>
    <template #header>Token Holding</template>
    <UTable
      :data="
        balances.map((balance, index) => ({
          ...balance,
          rank: index + 1,
          icon:
            balance.token.symbol === 'USDC' || balance.token.symbol === 'USDCe'
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
        { accessorKey: 'rank', header: 'RANK' },
        { accessorKey: 'token', header: 'Token', enableSorting: true },
        { accessorKey: 'amount', header: 'Amount', enableSorting: true },
        { accessorKey: 'price', header: 'Coin Price', enableSorting: true },
        { accessorKey: 'balance', header: 'Balance', enableSorting: true }
      ]"
    >
      <template #amount-cell="{ row: { original: row } }">
        {{ row.amount }} {{ row.token.symbol }}
      </template>
      <template #price-cell="{ row: { original: row } }">
        {{ row.values[currency.code ?? 'USD']?.formatedPrice }} / {{ row.token.symbol }}
      </template>

      <template #balance-cell="{ row: { original: row } }">
        {{ row.values[currency.code ?? 'USD']?.formated }}
      </template>

      <template #token-cell="{ row: { original: row } }">
        <div class="flex items-center gap-2 lg:w-48">
          <img v-if="row.icon" :src="row.icon" :alt="row.token.name" class="h-8 w-8 rounded-full" />
          <div v-else class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
            <span class="text-gray-500">{{ row.token.name.charAt(0) }}</span>
          </div>
          <div class="flex flex-col">
            <div class="font-medium">{{ row.token.name }}</div>
            <div class="text-sm text-gray-500">{{ row.token.symbol }}</div>
          </div>
        </div>
      </template>
    </UTable>
  </UCard>
</template>

<script setup lang="ts">
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
