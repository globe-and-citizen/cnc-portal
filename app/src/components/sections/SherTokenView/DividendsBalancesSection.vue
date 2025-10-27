<template>
  <CardComponent title="Dividends Holdings">
    <TableComponent
      :rows="tableRows"
      :loading="isLoading"
      :columns="columns"
      data-test="dividends-table"
    >
      <template #token-data="{ row }">
        <div class="flex items-center gap-2 lg:w-48" data-test="token-cell">
          <img
            v-if="row.icon"
            :src="row.icon"
            :alt="row.name"
            class="w-8 h-8 rounded-full"
            data-test="token-icon"
          />
          <div v-else class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
            <span class="text-gray-500">{{ row.name?.charAt(0) ?? '?' }}</span>
          </div>
        </div>
      </template>

      <template #amount-data="{ row }"> {{ row.amount }} {{ row.token.symbol }} </template>

      <template #usd-data="{ row }">
        {{ row.values['USD']?.formated ?? 0 }}
      </template>

      <template #empty>
        <div class="py-6 text-center text-sm text-gray-500">No dividend holdings</div>
      </template>
    </TableComponent>
  </CardComponent>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Address } from 'viem'
import CardComponent from '@/components/CardComponent.vue'
import TableComponent from '@/components/TableComponent.vue'
import { useContractBalance } from '@/composables/useContractBalance'
import { useTeamStore } from '@/stores/teamStore'
import EthereumIcon from '@/assets/Ethereum.png'
import USDCIcon from '@/assets/usdc.png'
import MaticIcon from '@/assets/matic-logo.png'
const teamStore = useTeamStore()

const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))
const { dividends, isLoading } = useContractBalance(bankAddress.value as Address)

// Columns config
const columns = [
  { key: 'rank', label: 'RANK' },
  { key: 'token', label: 'Token', sortable: true, class: 'min-w-32' },
  { key: 'amount', label: 'Amount', sortable: true, class: 'min-w-32' },
  { key: 'usd', label: 'USD', sortable: true, class: 'min-w-32 text-right' }
]

// Map token symbol to icon
const iconFor = (symbol?: string | null) => {
  if (!symbol) return null
  if (symbol.toUpperCase() === 'ETH') return EthereumIcon
  if (symbol.toUpperCase() === 'USDC') return USDCIcon
  if (symbol.toUpperCase() === 'MATIC' || symbol.toUpperCase() === 'POL') return MaticIcon
  return null
}

// Build table rows, filter > 0 USD, add rank and icon
const filtered = computed(() =>
  dividends.value
    .filter((d) => (d.values['USD']?.value ?? 0) > 0)
    .sort((a, b) => (b.values['USD']?.value ?? 0) - (a.values['USD']?.value ?? 0))
)

const tableRows = computed(() =>
  filtered.value.map((d, idx) => ({
    ...d,
    rank: idx + 1,
    name: d.token.name,
    icon: iconFor(d.token.symbol)
  }))
)
</script>
