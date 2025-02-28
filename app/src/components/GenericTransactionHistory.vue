<!-- GenericTransactionHistory.vue -->
<template>
  <div class="card bg-base-100 w-full shadow-sm">
    <div class="card-body">
      <div class="flex flex-row justify-between">
        <span class="text-lg font-medium" :data-test="`${dataTestPrefix}-title`">
          {{ title }}
        </span>
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
      </div>

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
              :href="getReceiptUrl(row as unknown as BaseTransaction)"
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
          v-for="currency in currencies"
          :key="currency"
          #[`amount${currency}-data`]="{ row }"
        >
          {{ formatAmount(row as unknown as BaseTransaction, currency) }}
        </template>
      </TableComponent>
    </div>

    <!-- Receipt Modal -->
    <ModalComponent v-if="showReceiptModal" v-model="receiptModal">
      <ReceiptComponent
        v-if="receiptModal && selectedTransaction"
        :receipt-data="formatReceiptData(selectedTransaction)"
      />
    </ModalComponent>
  </div>
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
import { NETWORK } from '@/constant'
import type { BaseTransaction } from '@/types/transactions'

interface Props {
  transactions: BaseTransaction[]
  title: string
  currencies: string[] // Array of currency codes: ['USD', 'CAD', 'INR', 'EUR']
  showDateFilter?: boolean
  showExport?: boolean
  showReceiptModal?: boolean
  dataTestPrefix?: string
  currencyRates?: {
    loading: boolean
    error: string | null
    getRate: (currency: string) => number
  }
}

const props = withDefaults(defineProps<Props>(), {
  showDateFilter: true,
  showExport: true,
  showReceiptModal: false,
  dataTestPrefix: 'transaction-history'
})

const emit = defineEmits<{
  (e: 'export'): void
  (e: 'receipt-click', transaction: BaseTransaction): void
}>()

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

// Methods
const formatDate = (date: string | number) => {
  return new Date(date).toLocaleDateString()
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
  emit('export')
}

const handleReceiptClick = (transaction: BaseTransaction) => {
  if (props.showReceiptModal) {
    selectedTransaction.value = transaction
    receiptModal.value = true
  }
  emit('receipt-click', transaction)
}

const getReceiptUrl = (transaction: BaseTransaction) => {
  return transaction.receipt || `${NETWORK.blockExplorerUrl}/tx/${transaction.txHash}`
}

const formatReceiptData = (transaction: BaseTransaction) => {
  const token = transaction.token
  return {
    txHash: transaction.txHash,
    date: formatDate(transaction.date),
    type: transaction.type,
    from: transaction.from,
    to: transaction.to,
    amountUsd: transaction.amountUSD,
    amount: String(transaction.amount || '0'),
    token: typeof token === 'string' ? token : String(token || '')
  }
}
</script>
