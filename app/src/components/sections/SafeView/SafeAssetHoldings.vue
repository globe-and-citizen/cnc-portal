<template>
  <div>
    <UCard data-test="safe-asset-holdings">
      <template #header>Token Holding</template>
      <UTable
        :data="rows"
        :loading="portfolio.isLoading.value"
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
          {{ row.quantity }} {{ row.token.symbol }}
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
            :title="row.address ?? undefined"
            data-test="safe-holding-token"
          >
            <img
              v-if="row.icon"
              :src="row.icon"
              :alt="row.token.name"
              class="h-8 w-8 rounded-full"
            />
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
    <UAlert
      v-if="portfolio.isIncomplete.value"
      color="warning"
      title="Some asset values are unavailable"
      description="Unpriced assets are retained. The wallet total is incomplete until every held asset can be valued."
      data-test="safe-asset-valuation-warning"
      class="mt-4"
    />
    <UButton
      class="mt-3"
      label="Refresh assets"
      variant="outline"
      data-test="refresh-safe-assets"
      @click="portfolio.refetch()"
    />
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useStorage } from '@vueuse/core'
import type { Address } from 'viem'
import { useSafePortfolio } from '@/composables/safe/useSafePortfolio'
import { safePortfolioRows } from '@/utils/safe/portfolio'
interface Props {
  address: Address
}

const props = defineProps<Props>()
const portfolio = useSafePortfolio(() => props.address)
const currency = useStorage('currency', { code: 'USD', name: 'US Dollar', symbol: '$' })
const rows = computed(() =>
  safePortfolioRows(
    portfolio.assets.data.value ?? [],
    portfolio.supported.data.value,
    currency.value.code
  )
)
</script>
