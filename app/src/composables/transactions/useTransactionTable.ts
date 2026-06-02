import { computed, ref, watch } from 'vue'
import type { ComputedRef } from 'vue'
import { groupTransactionsByTxHash, getTransactionTypeLabel } from '@/utils'
import type { GroupedTransactionRow } from '@/types/transaction-history'

type TransactionBase = {
  txHash: string
  type: string
  date: string | number
  from: string
  to: string
  amount: string | number
  amountUSD: number
  tokenAddress: string
  token: string
  amountLocal?: number
}

export const childHidden = (cell: { row: { depth: number } }) =>
  cell.row.depth > 0 ? 'hidden' : ''

// Keeps column width in layout but hides content for child rows (use on leading spacer columns)
export const childSpacer = (cell: { row: { depth: number } }) =>
  cell.row.depth > 0 ? 'invisible' : ''

// Colspan for the child row starting column, skipping `leading` spacer columns before it
export const childColspanFrom =
  (leading: number) =>
  (cell: { row: { depth: number; getAllCells: () => unknown[] } }): string =>
    String(cell.row.depth > 0 ? cell.row.getAllCells().length - leading : 1)

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
    ...uniqueTypes.value
      .map((type) => ({ label: getTransactionTypeLabel(type), value: type }))
      .sort((a, b) => a.label.localeCompare(b.label))
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

  const selectedTx = ref<T | null>(null)
  const showDetail = ref(false)
  const openDetail = (row: T) => {
    selectedTx.value = row
    showDetail.value = true
  }

  watch(filteredTransactions, () => {
    page.value = 1
    expandedRows.value = {}
  })

  watch(page, () => {
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
    getSubRows,
    selectedTx,
    showDetail,
    openDetail
  }
}
