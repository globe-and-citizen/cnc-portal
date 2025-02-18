<!-- TokenHoldingsSection.vue -->
<template>
  <div class="card bg-base-100 shadow-sm mb-8">
    <div class="card-body">
      <h3 class="text-lg font-medium mb-4">Token Holding</h3>
      <TableComponent
        :rows="tokensWithRank"
        :columns="[
          { key: 'rank', label: 'RANK' },
          { key: 'token', label: 'Token', sortable: true },
          { key: 'amount', label: 'Amount', sortable: true },
          { key: 'price', label: 'Coin Price', sortable: true },
          { key: 'balance', label: 'Balance', sortable: true }
        ]"
      >
        <template #token-data="{ row }">
          <div class="flex flex-col">
            <div class="font-medium">{{ row.name }}</div>
            <div class="text-sm text-gray-500">{{ row.network }}</div>
          </div>
        </template>
        <template #rank-data="{ row }">
          {{ row.rank }}
        </template>
        <template #price-data="{ row }"> ${{ row.price }} </template>
        <template #balance-data="{ row }"> ${{ row.balance }} </template>
      </TableComponent>
    </div>
  </div>
</template>

<script setup lang="ts">
import TableComponent from '@/components/TableComponent.vue'

interface Token {
  name: string
  network: string
  price: number
  balance: number
  amount: number
  rank: number
}

defineProps<{
  tokensWithRank: Token[]
}>()
</script>
