import { computed, ref, watch } from 'vue'
import type { ComputedRef } from 'vue'
import { groupTransactionsByTxHash } from '@/utils'
import type { GroupedTransactionRow } from '@/types/transaction-history'

type TransactionBase = { txHash: string; type: string; date: string | number }

export const PAGE_SIZE_OPTIONS = [
  { label: '10', value: 10 },
  { label: '20', value: 20 },
  { label: '50', value: 50 },
  { label: '100', value: 100 }
]

export const useTransactionTable = <T extends TransactionBase>(transactions: ComputedRef<T[]>) => {
  const dateRange = ref<[Date, Date] | null>(null)
  const selectedType = ref('all')
  const page = ref(1)
  const pageSize = ref(20)

  const uniqueTypes = computed(() => {
    const types = new Set(transactions.value.map((tx) => tx.type))
    return Array.from(types).sort()
  })

  const typeOptions = computed(() => [
    { label: 'All Types', value: 'all' },
    ...uniqueTypes.value.map((type) => ({ label: type, value: type }))
  ])

  const filteredTransactions = computed(() => {
    let filtered = transactions.value

    if (dateRange.value) {
      const [startDate, endDate] = dateRange.value
      filtered = filtered.filter((tx) => {
        const txDate = new Date(tx.date)
        return txDate >= startDate && txDate <= endDate
      })
    }

    if (selectedType.value !== 'all') {
      filtered = filtered.filter((tx) => tx.type === selectedType.value)
    }

    return filtered
  })

  const groupedTransactions = computed<GroupedTransactionRow<T>[]>(() =>
    groupTransactionsByTxHash(filteredTransactions.value)
  )

  const total = computed(() => groupedTransactions.value.length)

  const displayedTransactions = computed(() => {
    const start = (page.value - 1) * pageSize.value
    return groupedTransactions.value.slice(start, start + pageSize.value)
  })

  const expandedRows = ref<Record<string, boolean>>({})
  const getSubRows = (row: GroupedTransactionRow<T>): GroupedTransactionRow<T>[] =>
    row.subRows ?? []

  watch(filteredTransactions, () => {
    page.value = 1
    expandedRows.value = {}
  })

  watch(pageSize, () => {
    page.value = 1
  })

  return {
    dateRange,
    selectedType,
    typeOptions,
    page,
    pageSize,
    total,
    displayedTransactions,
    expandedRows,
    getSubRows
  }
}
