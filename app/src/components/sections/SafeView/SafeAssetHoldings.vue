<template>
  <UCard data-test="safe-asset-holdings">
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <span>Token holdings</span>
        <UButton
          label="Refresh assets"
          variant="outline"
          data-test="refresh-safe-assets"
          @click="portfolio.refetch()"
        />
      </div>
    </template>
    <UAlert
      v-if="portfolio.isIncomplete.value"
      color="warning"
      title="Some asset values are unavailable"
      description="Unpriced assets are retained. The wallet total is incomplete until every held asset can be valued."
      data-test="safe-asset-valuation-warning"
      class="mb-4"
    />
    <UTable
      :data="rows"
      :loading="portfolio.isLoading.value"
      :columns="columns"
      data-test="safe-asset-table"
    >
      <template #name-cell="{ row: { original: row } }">
        <div class="flex items-start gap-2">
          <img v-if="row.icon" :src="row.icon" alt="" class="h-8 w-8 rounded-full" />
          <div
            v-else
            class="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            aria-hidden="true"
          >
            {{ row.symbol.charAt(0) }}
          </div>
          <div class="min-w-0">
            <div class="font-medium">{{ row.name }}</div>
            <div class="text-muted text-sm">{{ row.symbol }}</div>
            <AddressTooltip v-if="row.address" :address="row.address" slice class="text-xs" />
          </div>
        </div>
      </template>
      <template #quantity-cell="{ row: { original: row } }">
        <span class="whitespace-nowrap">{{ row.quantity }} {{ row.symbol }}</span>
      </template>
    </UTable>
  </UCard>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import type { Address } from 'viem'
import AddressTooltip from '@/components/ui/AddressTooltip.vue'
import { useSafePortfolio } from '@/composables/safe/useSafePortfolio'
import { safePortfolioRows } from '@/utils/safe/portfolio'
interface Props {
  address: Address
}

const props = defineProps<Props>()
const portfolio = useSafePortfolio(() => props.address)
const columns = [
  { accessorKey: 'rank', header: 'Rank' },
  { accessorKey: 'name', header: 'Token' },
  { accessorKey: 'quantity', header: 'Amount' },
  { accessorKey: 'price', header: 'USD price' },
  { accessorKey: 'value', header: 'USD value' }
]
const rows = computed(() =>
  safePortfolioRows(portfolio.assets.data.value ?? [], portfolio.supported.data.value)
)
</script>
