<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <h3 class="text-lg font-semibold">
            Token Holdings {{ isOwner }}
          </h3>
          <UBadge v-if="isOwner" color="success">
            Owner
          </UBadge>
        </div>

        <UButton
          v-if="isOwner"
          color="primary"
          size="sm"
          icon="i-heroicons-arrow-down-tray"
          @click="$emit('openBatchModal')"
        >
          Withdraw
        </UButton>
      </div>
    </template>
    <!-- <pre>{{ tableRows }}</pre> -->
    <UTable
      :data="tableRows"
      :columns="columns"
      :loading="isLoading"
    >
      <template #empty>
        <div class="flex flex-col items-center justify-center py-8">
          <UIcon name="i-heroicons-circle-stack-20-solid" class="w-12 h-12 text-gray-400 mb-3" />
          <p class="text-gray-500">
            No tokens available
          </p>
        </div>
      </template>

      <template #rank-cell="{ row }">
        <span class="text-gray-500 dark:text-gray-400">
          {{ row.original.rank }}
        </span>
      </template>

      <template #symbol-cell="{ row }">
        <div class="flex items-center gap-3">
          <UAvatar
            :alt="row.original.symbol"
            size="sm"
          >
            <template #fallback>
              <span class="text-sm font-semibold">
                {{ row.original.symbol.charAt(0) }}
              </span>
            </template>
          </UAvatar>
          <span class="font-semibold whitespace-nowrap">
            {{ row.original.symbol }}
          </span>
        </div>
      </template>

      <template #shortAddress-cell="{ row }">
        <UBadge variant="subtle" color="neutral">
          <span class="font-mono text-xs">
            {{ row.original.shortAddress }}
          </span>
        </UBadge>
      </template>

      <template #formattedBalance-cell="{ row }">
        <div>
          <div v-if="row.original.formattedBalance" class="font-medium whitespace-nowrap">
            {{ row.original.formattedBalance }} {{ row.original.symbol }}
          </div>
          <div v-if="row.original.formattedValue" class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {{ row.original.formattedValue }}
          </div>
        </div>
      </template>
    </UTable>
  </UCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFeeCollector } from '@/composables/useFeeCollector'
import type { TokenDisplay } from '@/types/token'
import { isFeeCollectorOwner } from '~/composables/FeeCollector/read'

defineEmits<{
  openBatchModal: []
}>()

interface TableRow extends TokenDisplay {
  rank: number
}

const isOwner = isFeeCollectorOwner()

// Get data directly from composables and store
const { tokens, isLoading } = useFeeCollector()

// Define table columns
const columns = [
  {
    accessorKey: 'rank',
    header: 'RANK'
  },
  {
    accessorKey: 'symbol',
    header: 'Token'
  },
  {
    accessorKey: 'shortAddress',
    header: 'Address'
  },
  {
    accessorKey: 'formattedBalance',
    header: 'Amount'
  }
]

// Transform tokens into table rows with rank
const tableRows = computed<TableRow[]>(() => {
  return tokens.value.map((token, index) => ({
    ...token,
    rank: index + 1
  }))
})
</script>
