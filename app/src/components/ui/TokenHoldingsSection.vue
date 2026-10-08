<template>
  <div>
    <UCard data-test="safe-asset-holdings">
      <template #header>Token Holding</template>
      <UTable
        :data="rows"
        :loading="isLoading"
        :columns="[
          { accessorKey: 'rank', header: 'RANK' },
          { accessorKey: 'token', header: 'Token', enableSorting: true },
          { accessorKey: 'amount', header: 'Amount', enableSorting: true },
          { accessorKey: 'price', header: 'Coin Price', enableSorting: true },
          { accessorKey: 'balance', header: 'Balance', enableSorting: true }
        ]"
        data-test="safe-asset-table"
      >
        <template #amount-cell="{ row: { original: row } }">
          <span :title="row.quantity" data-test="safe-holding-amount">
            {{ row.amountLabel }} {{ row.token.symbol }}
          </span>
        </template>
        <template #price-cell="{ row: { original: row } }">
          {{ row.priceLabel }} / {{ row.token.symbol }}
        </template>
        <template #balance-cell="{ row: { original: row } }">
          {{ row.balanceLabel }}
        </template>
        <template #token-cell="{ row: { original: row } }">
          <div
            class="flex items-center gap-2 lg:w-48"
            :title="row.address ? `${row.name} (${row.address})` : row.name"
            data-test="safe-holding-token"
          >
            <img
              v-if="row.icon && !failedIcons.has(row.icon)"
              :src="row.icon"
              :alt="row.token.symbol"
              class="h-8 w-8 rounded-full"
              @error="row.icon && failedIcons.add(row.icon)"
            />
            <div v-else class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
              <span class="text-gray-500">{{ row.token.symbol.charAt(0) }}</span>
            </div>
            <div class="flex flex-col">
              <div class="font-medium">{{ compact ? row.token.symbol : row.token.name }}</div>
              <div v-if="!compact" class="text-sm text-gray-500">{{ row.token.symbol }}</div>
            </div>
          </div>
        </template>
      </UTable>
    </UCard>
    <UAlert
      v-if="isIncomplete"
      color="warning"
      title="Some asset values are unavailable"
      description="Unpriced assets are retained. The wallet total is incomplete until every held asset can be valued."
      data-test="safe-asset-valuation-warning"
      class="mt-4"
    />
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import type { TokenHoldingRow } from '@/utils/tokens/holdings'

defineProps<{
  rows: TokenHoldingRow[]
  isLoading?: boolean
  isIncomplete?: boolean
  compact?: boolean
}>()
const failedIcons = ref(new Set<string>())
</script>
