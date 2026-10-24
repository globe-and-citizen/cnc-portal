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
          { accessorKey: 'balance', header: 'Balance', enableSorting: true },
          ...(rows.some((row) => row.pnl) ? [{ id: 'pnl', header: 'P&L (USD)' }] : [])
        ]"
        data-test="safe-asset-table"
      >
        <template #pnl-cell="{ row: { original: row } }">
          <span
            :title="row.pnl?.details"
            :aria-label="row.pnl?.details"
            tabindex="0"
            :class="{ 'text-green-700': row.pnl?.positive, 'text-red-700': row.pnl?.negative }"
            data-test="safe-holding-pnl"
            >{{ row.pnl?.label }}</span
          >
        </template>
        <template #amount-cell="{ row: { original: row } }">
          <span :title="row.quantity" data-test="safe-holding-amount">
            {{ row.amountLabel }} {{ row.token.symbol }}
          </span>
        </template>
        <template #price-cell="{ row: { original: row } }">
          <span
            :title="row.priceDetails"
            :aria-label="row.priceDetails"
            :tabindex="row.priceDetails ? 0 : undefined"
            data-test="safe-holding-price"
          >
            {{ row.priceLabel }} / {{ row.token.symbol }}
          </span>
        </template>
        <template #balance-cell="{ row: { original: row } }">
          <span
            :title="row.balanceDetails"
            :aria-label="row.balanceDetails"
            :tabindex="row.balanceDetails ? 0 : undefined"
            data-test="safe-holding-value"
          >
            {{ row.balanceLabel }}
          </span>
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
    <details
      v-if="unrecognizedRows?.length"
      class="mt-4 rounded-md border border-gray-200 p-3 text-sm"
      data-test="safe-unrecognized-assets"
    >
      <summary class="cursor-pointer font-medium">
        Unrecognized tokens ({{ unrecognizedRows.length }})
      </summary>
      <p class="mt-2 text-gray-500">
        Tokens the Safe received without acquiring them through one of its own swaps, such as
        unsolicited airdrops. They are left out of the wallet total and the books. Do not interact
        with them.
      </p>
      <ul class="mt-2 space-y-1">
        <li
          v-for="row in unrecognizedRows"
          :key="row.address ?? row.rank"
          class="flex justify-between gap-2 font-mono text-xs"
          data-test="safe-unrecognized-asset"
        >
          <span class="truncate">{{ row.address }}</span>
          <span>{{ row.quantity }}</span>
        </li>
      </ul>
    </details>
    <UAlert
      v-if="hasError"
      color="error"
      title="Wallet assets are unavailable"
      description="Asset balances could not be loaded. Try again from the wallet overview."
      data-test="safe-asset-load-error"
      class="mt-4"
    />
    <UAlert
      v-else-if="isIncomplete"
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
  /** Unsolicited tokens kept out of the table, the wallet total and the books. */
  unrecognizedRows?: TokenHoldingRow[]
  isLoading?: boolean
  isIncomplete?: boolean
  hasError?: boolean
  compact?: boolean
}>()
const failedIcons = ref(new Set<string>())
</script>
