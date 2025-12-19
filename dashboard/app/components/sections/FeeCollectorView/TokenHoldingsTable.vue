<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <h3 class="text-lg font-semibold">
            Token Holdings
          </h3>
          <UBadge v-if="isFeeCollectorOwner" color="success">
            Owner
          </UBadge>
        </div>

        <UButton
          v-if="isFeeCollectorOwner"
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
          dssdds
          <pre> {{ row }}</pre>
        </span>
      </template>

      <!-- <template #token-data="{ row }">
        <div class="flex items-center gap-3">
          <UAvatar
            :alt="(row as unknown as TableRow).symbol"
            size="sm"
          >
            <template #fallback>
              <span class="text-sm font-semibold">
                {{ (row as unknown as TableRow).symbol.charAt(0) }}
              </span>
            </template>
          </UAvatar>
          <span class="font-semibold whitespace-nowrap">
            {{ (row as unknown as TableRow).symbol }}
          </span>
        </div>
      </template>

      <template #address-data="{ row }">
        <UBadge variant="subtle" color="neutral">
          <span class="font-mono text-xs">
            {{ (row as unknown as TableRow).shortAddress }}
          </span>
        </UBadge>
      </template>

      <template #amount-data="{ row }">
        <div>
          <div class="font-medium whitespace-nowrap">
            {{ formatAmount((row as unknown as TableRow).formattedBalance) }} {{ (row as unknown as TableRow).symbol }}
          </div>
          <div v-if="(row as unknown as TableRow).usdValue" class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {{ (row as unknown as TableRow).usdValue }}
          </div>
        </div>
      </template> -->
    </UTable>
  </UCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFeeCollector } from '@/composables/useFeeCollector'
import { useTokenPriceStore } from '@/stores/useTokenPriceStore'
import type { TokenDisplay } from '@/types/token'
import type { TableColumn } from '@nuxt/ui'

defineEmits<{
  openBatchModal: []
}>()

interface TableRow {
  rank: number
  usdValue: string | null
}

// Get data directly from composables and store
const { tokens, isLoading, isFeeCollectorOwner } = useFeeCollector()
const tokenPriceStore = useTokenPriceStore()

type Payment = {
  id: string
  date: string
  status: 'paid' | 'failed' | 'refunded'
  email: string
  amount: number
}

// Define table columns

const columns: TableColumn<Payment>[] = [
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

// Format amount with appropriate decimals
const formatAmount = (amount: string): string => {
  const num = parseFloat(amount)
  if (isNaN(num)) return '0'

  // Show more decimals for small amounts
  if (num < 0.01) return num.toFixed(6)
  if (num < 1) return num.toFixed(4)
  return num.toFixed(2)
}

// Get USD value for token
const getTokenUSD = (token: TokenDisplay, formattedBalance: string): string | null => {
  try {
    const price = tokenPriceStore.getTokenPrice({
      isNative: token.isNative,
      symbol: token.symbol
    })

    if (!price || price <= 0) return null

    const amount = parseFloat(formattedBalance)
    if (isNaN(amount) || amount === 0) return null

    const usdValue = amount * price

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(usdValue)
  } catch (err) {
    console.error('Error calculating USD value:', err)
    return null
  }
}

// Transform tokens into table rows with rank
const tableRows = computed<TableRow[]>(() => {
  return tokens.value.map((token, index) => ({
    ...token,
    rank: index + 1,
    niveau: 1,
    usdValue: getTokenUSD(token, token.formattedBalance)
  }))
})

watch(tableRows, () => {
  console.log('Tokens updated:', tableRows.value)
})
</script>
