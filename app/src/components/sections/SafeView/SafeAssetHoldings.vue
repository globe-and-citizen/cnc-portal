<template>
  <div>
    <TokenHoldingsSection :address="address" />
    <UCard class="mt-4" data-test="safe-discovered-assets">
      <template #header>Other Safe assets</template>
      <UAlert
        v-if="portfolio.isIncomplete.value"
        color="warning"
        title="Some asset values are unavailable"
        description="Unpriced assets are retained. The wallet total is incomplete until every held asset can be valued."
        data-test="safe-asset-valuation-warning"
      />
      <UButton
        class="my-3"
        label="Refresh assets"
        variant="outline"
        data-test="refresh-safe-assets"
        @click="portfolio.refetch()"
      />
      <UTable
        :data="rows"
        :loading="portfolio.isLoading.value"
        :columns="columns"
        data-test="safe-asset-table"
      />
    </UCard>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import type { Address } from 'viem'
import TokenHoldingsSection from '@/components/ui/TokenHoldingsSection.vue'
import { useSafePortfolio } from '@/composables/safe/useSafePortfolio'
import { safePortfolioRows } from '@/utils/safe/portfolio'
const props = defineProps<{ address: Address }>()
const portfolio = useSafePortfolio(() => props.address)
const columns = [
  { accessorKey: 'name', header: 'Token' },
  { accessorKey: 'symbol', header: 'Currency' },
  { accessorKey: 'address', header: 'Contract' },
  { accessorKey: 'quantity', header: 'Amount' },
  { accessorKey: 'price', header: 'USD price' },
  { accessorKey: 'value', header: 'USD value' }
]
const rows = computed(() => safePortfolioRows(portfolio.assets.data.value ?? []))
</script>
