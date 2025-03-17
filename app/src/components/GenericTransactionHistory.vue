<!-- GenericTransactionHistory.vue -->
<template>
  <CardComponent :title="title" class="w-full">
    <template #card-action>
      <div class="flex items-center gap-10">
        <Datepicker
          v-if="showDateFilter"
          v-model="dateRange"
          class="w-96"
          range
          :format="'dd/MM/yyyy'"
          placeholder="Select Date Range"
          auto-apply
          :data-test="`${dataTestPrefix}-date-range-picker`"
        />
        <ButtonUI
          v-if="showExport"
          variant="success"
          @click="handleExport"
          :data-test="`${dataTestPrefix}-export-button`"
        >
          Export
        </ButtonUI>
      </div>
    </template>

    <TableComponent :rows="displayedTransactions" :columns="columns">
      <!-- Transaction Hash -->
      <template #txHash-data="{ row }">
        <AddressToolTip
          :address="(row as unknown as BaseTransaction).txHash"
          :slice="true"
          type="transaction"
        />
      </template>

      <!-- Date -->
      <template #date-data="{ row }">
        {{ formatDate((row as unknown as BaseTransaction).date) }}
      </template>

      <!-- Type -->
      <template #type-data="{ row }">
        <span
          class="badge"
          :class="{
            'badge-success': (row as unknown as BaseTransaction).type.toLowerCase() === 'deposit',
            'badge-info': (row as unknown as BaseTransaction).type.toLowerCase() === 'transfer'
          }"
        >
          {{ (row as unknown as BaseTransaction).type }}
        </span>
      </template>

      <!-- From Address -->
      <template #from-data="{ row }">
        <AddressToolTip :address="(row as unknown as BaseTransaction).from" :slice="true" />
      </template>

      <!-- To Address -->
      <template #to-data="{ row }">
        <AddressToolTip :address="(row as unknown as BaseTransaction).to" :slice="true" />
      </template>

      <!-- Receipt -->
      <template #receipt-data="{ row }">
        <template v-if="showReceiptModal">
          <ButtonUI
            size="sm"
            @click="handleReceiptClick(row as unknown as BaseTransaction)"
            :data-test="`${dataTestPrefix}-receipt-button`"
          >
            Receipt
          </ButtonUI>
        </template>
        <template v-else>
          <a
            :href="getReceiptUrl(row.txHash)"
            target="_blank"
            class="text-primary hover:text-primary-focus transition-colors duration-200 flex items-center gap-2"
          >
            <DocumentTextIcon class="h-4 w-4" />
            Receipt
          </a>
        </template>
      </template>

      <!-- Dynamic currency amounts -->
      <template
        v-for="(currency, index) in currencies"
        :key="index"
        #[`amount${currency}-data`]="{ row }"
      >
        {{ formatAmount(row as unknown as BaseTransaction, currency) }}
      </template>
    </TableComponent>

    <!-- Receipt Modal -->
    <ModalComponent v-if="showReceiptModal" v-model="receiptModal">
      <ReceiptComponent
        v-if="receiptModal && selectedTransaction"
        :receipt-data="formatReceiptData(selectedTransaction)"
        @export-excel="handleReceiptExport"
        @export-pdf="handleReceiptPdfExport"
      />
    </ModalComponent>
  </CardComponent>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { DocumentTextIcon } from '@heroicons/vue/24/outline'
import TableComponent, { type TableColumn } from '@/components/TableComponent.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import Datepicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import ModalComponent from '@/components/ModalComponent.vue'
import ReceiptComponent from '@/components/sections/ExpenseAccountView/ReceiptComponent.vue'
import CardComponent from '@/components/CardComponent.vue'
import { NETWORK } from '@/constant'
import type { BaseTransaction } from '@/types/transactions'
import { exportTransactionsToExcel, exportReceiptToExcel } from '@/utils/excelExport'
import { exportTransactionsToPdf, exportReceiptToPdf } from '@/utils/pdfExport'
import type { ReceiptData } from '@/utils/excelExport'
import { useToastStore } from '@/stores/useToastStore'

interface Props {
  transactions: BaseTransaction[]
  title: string
  currencies: string[] // Array of currency codes: ['USD', 'CAD', 'INR', 'EUR']
  currencyRates: {
    loading: boolean
    error: string | null
    getRate: (currency: string) => number
  }
  showDateFilter?: boolean
  showExport?: boolean
  showReceiptModal?: boolean
  dataTestPrefix?: string
}

const props = withDefaults(defineProps<Props>(), {
  showDateFilter: true,
  showExport: true,
  showReceiptModal: false,
  dataTestPrefix: 'transaction-history'
})

const emit = defineEmits<{
  (e: 'export'): void
  (e: 'receipt-click', data: ReceiptData): void
}>()

const toastStore = useToastStore()

// State
const dateRange = ref<[Date, Date] | null>(null)
const receiptModal = ref(false)
const selectedTransaction = ref<BaseTransaction | null>(null)

// Computed columns based on currencies
const columns = computed(() => {
  const baseColumns = [
    { key: 'txHash', label: 'Tx Hash', sortable: false },
    { key: 'date', label: 'Date', sortable: true },
    { key: 'type', label: 'Type', sortable: false },
    { key: 'from', label: 'From', sortable: false },
    { key: 'to', label: 'To', sortable: false }
  ]

  const currencyColumns = props.currencies.map((currency) => ({
    key: `amount${currency}`,
    label: `Amount (${currency})`,
    sortable: false
  }))

  return [
    ...baseColumns,
    ...currencyColumns,
    { key: 'receipt', label: 'Receipt', sortable: false }
  ] as TableColumn[]
})

// Filter transactions based on date range
const displayedTransactions = computed(() => {
  if (!dateRange.value) return props.transactions

  const [startDate, endDate] = dateRange.value
  return props.transactions.filter((transaction) => {
    const txDate = new Date(transaction.date)
    return txDate >= startDate && txDate <= endDate
  })
})

const formatDate = (date: string | number) => {
  try {
    if (typeof date === 'number') {
      const dateObj = new Date(date)
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleString()
      }
    }

    if (typeof date === 'string') {
      const dateObj = new Date(date)
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleString()
      }

      const timestamp = parseInt(date) * 1000
      const timestampDate = new Date(timestamp)
      if (!isNaN(timestampDate.getTime())) {
        return timestampDate.toLocaleString()
      }
    }

    console.error('Invalid date format:', date)
    return 'Invalid Date'
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Invalid Date'
  }
}

const formatAmount = (transaction: BaseTransaction, currency: string) => {
  const key = `amount${currency}` as keyof BaseTransaction
  const amount = transaction[key]
  if (typeof amount === 'number') return amount.toFixed(2)

  // If amount for this currency doesn't exist but we have USD amount and currency rates
  if (transaction.amountUSD && props.currencyRates?.getRate) {
    const rate = props.currencyRates.getRate(currency)
    return (transaction.amountUSD * rate).toFixed(2)
  }

  return '0.00'
}

const handleExport = () => {
  try {
    const headers = columns.value.map((col) => col.label)
    const rows = displayedTransactions.value.map((tx) => {
      return columns.value.map((col) => {
        switch (col.key) {
          case 'date':
            return formatDate(tx.date)
          case 'txHash':
            return tx.txHash
          case 'type':
            return tx.type
          case 'from':
            return tx.from
          case 'to':
            return tx.to
          case 'receipt':
            return getReceiptUrl(tx.txHash)
          default:
            if (col.key.startsWith('amount')) {
              const currency = col.key.replace('amount', '')
              return formatAmount(tx, currency)
            }
            return ''
        }
      })
    })

    const date = new Date().toISOString().split('T')[0]
    const excelSuccess = exportTransactionsToExcel(headers, rows, date)
    const pdfSuccess = exportTransactionsToPdf(headers, rows, date)

    if (excelSuccess && pdfSuccess) {
      toastStore.addSuccessToast('Transactions exported successfully')
    } else {
      toastStore.addErrorToast('Failed to export some transactions')
    }
  } catch (error) {
    console.error('Error exporting transactions:', error)
    toastStore.addErrorToast('Failed to export transactions')
  }
}

const handleReceiptClick = (transaction: BaseTransaction) => {
  const receiptData = formatReceiptData(transaction)
  if (props.showReceiptModal) {
    selectedTransaction.value = transaction
    receiptModal.value = true
  }
  emit('receipt-click', receiptData)
}

const getReceiptUrl = (txHash: string) => {
  return `${NETWORK.blockExplorerUrl}/tx/${txHash}`
}

const formatReceiptData = (transaction: BaseTransaction): ReceiptData => {
  return {
    txHash: String(transaction.txHash),
    date: formatDate(transaction.date),
    type: String(transaction.type),
    from: String(transaction.from),
    to: String(transaction.to),
    amount: String(transaction.amount || ''),
    token: String(transaction.token),
    amountUSD: Number(transaction.amountUSD || 0)
  }
}

const handleReceiptExport = (receiptData: ReceiptData) => {
  try {
    const success = exportReceiptToExcel(receiptData)
    if (success) {
      toastStore.addSuccessToast('Receipt exported successfully')
    } else {
      toastStore.addErrorToast('Failed to export receipt')
    }
  } catch (error) {
    console.error('Error exporting receipt:', error)
    toastStore.addErrorToast('Failed to export receipt')
  }
}

const handleReceiptPdfExport = (receiptData: ReceiptData) => {
  try {
    const success = exportReceiptToPdf(receiptData)
    if (success) {
      toastStore.addSuccessToast('Receipt PDF exported successfully')
    } else {
      toastStore.addErrorToast('Failed to export receipt PDF')
    }
  } catch (error) {
    console.error('Error exporting receipt PDF:', error)
    toastStore.addErrorToast('Failed to export receipt PDF')
  }
}
</script>
