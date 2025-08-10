<template>
  <CardComponent :title="title" class="w-full">
    <template #card-action>
      <div class="flex items-center gap-2">
        <CustomDatePicker
          v-if="showDateFilter"
          v-model="dateRange"
          class="min-w-[140px]"
          :data-test-prefix="dataTestPrefix"
        />
        <div class="relative">
          <ButtonUI
            class="flex items-center cursor-pointer gap-4 border border-gray-300 min-w-[110px]"
            @click="typeDropdownOpen = !typeDropdownOpen"
            :data-test="`${dataTestPrefix}-type-filter`"
          >
            <span>{{ selectedTypeLabel }}</span>
            <IconifyIcon icon="heroicons:chevron-down" class="w-4 h-4" />
          </ButtonUI>
          <ul
            class="absolute right-0 mt-2 menu bg-base-200 border-2 rounded-box z-[1] w-40 p-2 shadow"
            ref="typeDropdownTarget"
            v-if="typeDropdownOpen"
          >
            <li @click="selectType('')"><a>All Types</a></li>
            <li v-for="type in uniqueTypes" :key="type" @click="selectType(type)">
              <a>{{ type }}</a>
            </li>
          </ul>
        </div>
      </div>
    </template>

    <TableComponent
      :rows="displayedTransactions"
      :columns="columns"
      v-model:current-page="currentPage"
      v-model:items-per-page="itemsPerPage"
      :page-size-options="[5, 10, 15, 20]"
      :max-displayed-pages="5"
    >
      <template #txHash-data="{ row }">
        <AddressToolTip :address="row.txHash" :slice="true" type="transaction" />
      </template>

      <template #date-data="{ row }">{{ formatDate(row.date) }}</template>

      <template #type-data="{ row }">
        <span class="badge" :class="getTypeClass(row.type)">{{ row.type }}</span>
      </template>

      <template #from-data="{ row }">
        <AddressToolTip :address="row.from" :slice="true" type="address" />
      </template>

      <template #to-data="{ row }">
        <AddressToolTip :address="row.to" :slice="true" type="address" />
      </template>

      <template #amount-data="{ row }">{{ row.amount }} {{ row.token }}</template>
      <template #amountUSD-data="{ row }">
        {{ formatUSDAmount(row.amountUSD) }}
      </template>
    </TableComponent>
  </CardComponent>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import TableComponent, { type TableColumn } from '@/components/TableComponent.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import CardComponent from '@/components/CardComponent.vue'
import CustomDatePicker from '@/components/CustomDatePicker.vue'
import type { InvestorsTransaction } from '@/types/transactions'
import { onClickOutside } from '@vueuse/core'
import { formatCurrencyShort } from '@/utils'

const props = withDefaults(
  defineProps<{
    transactions: InvestorsTransaction[]
    title: string
    showDateFilter?: boolean
    dataTestPrefix?: string
  }>(),
  {
    showDateFilter: true,
    dataTestPrefix: 'investor-transaction-history'
  }
)

const dateRange = ref<[Date, Date] | null>(null)
const selectedType = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(10)
const typeDropdownOpen = ref(false)
const typeDropdownTarget = ref<HTMLElement | null>(null)

const columns = computed<TableColumn[]>(() => [
  { key: 'txHash', label: 'Tx Hash', sortable: false },
  { key: 'date', label: 'Date', sortable: true },
  { key: 'type', label: 'Type', sortable: false },
  { key: 'from', label: 'From', sortable: false },
  { key: 'to', label: 'To', sortable: false },
  { key: 'amount', label: 'Amount', sortable: false },
  { key: 'amountUSD', label: 'Amount (USD)', sortable: false }
])

const uniqueTypes = computed(() => {
  const types = new Set(props.transactions.map((tx) => tx.type))
  return Array.from(types).sort()
})

const displayedTransactions = computed(() => {
  let filtered = props.transactions

  if (dateRange.value) {
    const [startDate, endDate] = dateRange.value
    filtered = filtered.filter((tx) => {
      const txDate = new Date(tx.date)
      return txDate >= startDate && txDate <= endDate
    })
  }

  if (selectedType.value) {
    filtered = filtered.filter((tx) => tx.type === selectedType.value)
  }

  return filtered
})

const formatDate = (date: string) => {
  try {
    const dateObj = new Date(date)
    return dateObj.toLocaleString()
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Invalid Date'
  }
}

const getTypeClass = (type: string) => ({
  'badge-success': type === 'mint',
  'badge-info': type === 'transfer',
  'badge-warning': type === 'dividend'
})

const formatUSDAmount = (amount: number): string => {
  try {
    return formatCurrencyShort(amount, 'USD')
  } catch (error) {
    console.error('Error formatting USD amount:', error)
    return '$0.00'
  }
}

const selectedTypeLabel = computed(() => (selectedType.value ? selectedType.value : 'All Types'))

const selectType = (type: string) => {
  selectedType.value = type
  typeDropdownOpen.value = false
}

onClickOutside(typeDropdownTarget, () => {
  typeDropdownOpen.value = false
})
</script>
