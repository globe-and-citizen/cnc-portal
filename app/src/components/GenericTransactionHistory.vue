<!-- GenericTransactionHistory.vue -->
<template>
  <CardComponent :title="title" class="w-full">
    <template #card-action>
      <div class="flex items-center gap-10">
        <div v-if="showDateFilter">
          <CustomDatePicker v-model="dateRange" :data-test-prefix="dataTestPrefix" />
        </div>
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

    <TableComponent
      :rows="displayedTransactions"
      :columns="columns"
      v-model:current-page="currentPage"
      v-model:items-per-page="itemsPerPage"
      :page-size-options="[5, 10, 15, 20]"
      :max-displayed-pages="5"
    >
      <template
        #pagination-info="{
          startIndex,
          endIndex,
          totalItems
        }: {
          startIndex: number
          endIndex: number
          totalItems: number
        }"
      >
        <div class="text-sm text-gray-600">
          Showing transactions {{ startIndex + 1 }} to {{ endIndex }} of {{ totalItems }}
        </div>
      </template>

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
        <template v-if="isContract((row as unknown as BaseTransaction).from)">
          <a
            :href="`${NETWORK.blockExplorerUrl}/address/${(row as unknown as BaseTransaction).from}`"
            target="_blank"
            class="flex items-center gap-2 text-emerald-600 hover:text-emerald-800 hover:underline transition-colors duration-200"
          >
            <IconifyIcon
              :icon="getContractType((row as unknown as BaseTransaction).from).icon"
              class="w-5 h-5"
            />
            <span class="font-medium">{{
              getContractType((row as unknown as BaseTransaction).from).type
            }}</span>
          </a>
        </template>
        <UserComponent
          v-else
          :user="{
            name: getMemberName((row as unknown as BaseTransaction).from),
            imageUrl: getMemberImage((row as unknown as BaseTransaction).from),
            address: (row as unknown as BaseTransaction).from
          }"
        />
      </template>

      <!-- To Address -->
      <template #to-data="{ row }">
        <template v-if="isContract((row as unknown as BaseTransaction).to)">
          <a
            :href="`${NETWORK.blockExplorerUrl}/address/${(row as unknown as BaseTransaction).to}`"
            target="_blank"
            class="flex items-center gap-2 text-emerald-600 hover:text-emerald-800 hover:underline transition-colors duration-200"
          >
            <IconifyIcon
              :icon="getContractType((row as unknown as BaseTransaction).to).icon"
              class="w-5 h-5"
            />
            <span class="font-medium">{{
              getContractType((row as unknown as BaseTransaction).to).type
            }}</span>
          </a>
        </template>
        <UserComponent
          v-else
          :user="{
            name: getMemberName((row as unknown as BaseTransaction).to),
            imageUrl: getMemberImage((row as unknown as BaseTransaction).to),
            address: (row as unknown as BaseTransaction).to
          }"
        />
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
            <IconifyIcon icon="heroicons-outline:document-text" class="h-4 w-4" />
            Receipt
          </a>
        </template>
      </template>

      <!-- Amount with token -->
      <template #amount-data="{ row }">
        {{ Number((row as unknown as BaseTransaction).amount) }}
        {{ (row as unknown as BaseTransaction).token }}
      </template>

      <!-- Value in USD -->
      <template #valueUSD-data="{ row }">
        {{ formatAmount(row as unknown as BaseTransaction, 'USD') }}
      </template>

      <!-- Value in local currency -->
      <template #valueLocal-data="{ row }">
        {{ formatAmount(row as unknown as BaseTransaction, currencyStore.currency.code) }}
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
import { ref, computed, onMounted } from 'vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import TableComponent, { type TableColumn } from '@/components/TableComponent.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import ReceiptComponent from '@/components/ReceiptComponent.vue'
import CardComponent from '@/components/CardComponent.vue'
import CustomDatePicker from '@/components/CustomDatePicker.vue'
import UserComponent from '@/components/UserComponent.vue'
import { NETWORK } from '@/constant'
import type { BaseTransaction } from '@/types/transactions'
import type { Member } from '@/types'
import { exportTransactionsToExcel, exportReceiptToExcel } from '@/utils/excelExport'
import { exportTransactionsToPdf, exportReceiptToPdf } from '@/utils/pdfExport'
import type { ReceiptData } from '@/utils/excelExport'
import { useToastStore } from '@/stores/useToastStore'
import { useCurrencyStore } from '@/stores/currencyStore'
import { useTeamStore } from '@/stores'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'

interface Props {
  transactions: BaseTransaction[]
  title: string
  currencies: string[] // Array of currency codes: ['USD', 'CAD', 'INR', 'EUR']
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
  (e: 'receipt-click', data: import('@/utils/excelExport').ReceiptData): void
}>()

const toastStore = useToastStore()
const currencyStore = useCurrencyStore()
const teamStore = useTeamStore()
const route = useRoute()
const { nativeTokenPriceInUSD, nativeTokenPrice } = storeToRefs(currencyStore)
const { currentTeam } = storeToRefs(teamStore)

// State
const dateRange = ref<[Date, Date] | null>(null)
const receiptModal = ref(false)
const selectedTransaction = ref<BaseTransaction | null>(null)

// Add pagination state
const currentPage = ref(1)
const itemsPerPage = ref(10) // Default to 10 items per page

// Load team data when component mounts
onMounted(async () => {
  const teamId = route.params.id as string
  if (teamId && (!currentTeam.value || currentTeam.value.id !== teamId)) {
    await teamStore.setCurrentTeamId(teamId)
  }
})

// Computed columns based on currencies
const columns = computed(() => {
  const baseColumns = [
    { key: 'txHash', label: 'Tx Hash', sortable: false },
    { key: 'date', label: 'Date', sortable: true },
    { key: 'type', label: 'Type', sortable: false },
    { key: 'from', label: 'From', sortable: false },
    { key: 'to', label: 'To', sortable: false },
    { key: 'amount', label: 'Amount', sortable: false },
    { key: 'valueUSD', label: 'Value (USD)', sortable: false }
  ] as TableColumn[]

  // Add local currency column if it's not USD
  if (currencyStore.currency.code !== 'USD') {
    baseColumns.push({
      key: 'valueLocal',
      label: `Value (${currencyStore.currency.code})`,
      sortable: false
    })
  }

  baseColumns.push({ key: 'receipt', label: 'Receipt', sortable: false })
  return baseColumns
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
  const tokenAmount = Number(transaction.amount)
  if (tokenAmount <= 0) return currency === 'USD' ? '$0.00' : '0.00'

  let usdAmount = 0
  if (transaction.token === 'USDC') {
    usdAmount = tokenAmount
  } else {
    usdAmount = tokenAmount * nativeTokenPriceInUSD.value!
  }

  if (currency === 'USD') {
    return Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(usdAmount)
  }

  const exchangeRate = nativeTokenPrice.value! / nativeTokenPriceInUSD.value!
  return Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(usdAmount * exchangeRate)
}

const handleExport = async () => {
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
              return formatAmount(tx, 'USD')
            }
            return ''
        }
      })
    })

    const date = new Date().toISOString().split('T')[0]
    const excelSuccess = exportTransactionsToExcel(headers, rows, date)
    const pdfSuccess = await exportTransactionsToPdf(headers, rows, date)

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
  const usdAmount = formatAmount(transaction, 'USD')
  const localAmount =
    currencyStore.currency.code !== 'USD'
      ? formatAmount(transaction, currencyStore.currency.code)
      : usdAmount

  return {
    txHash: String(transaction.txHash),
    date: formatDate(transaction.date),
    type: String(transaction.type),
    from: String(transaction.from),
    to: String(transaction.to),
    amount: String(transaction.amount || ''),
    token: String(transaction.token),
    amountUSD: Number(transaction.amountUSD || 0),
    valueUSD: usdAmount,
    valueLocal: localAmount
  }
}

const handleReceiptExport = (receiptData: import('@/utils/excelExport').ReceiptData) => {
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

const handleReceiptPdfExport = async (receiptData: import('@/utils/excelExport').ReceiptData) => {
  try {
    const success = await exportReceiptToPdf(receiptData)
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

interface ExtendedMember extends Member {
  imageUrl?: string
}

const getMemberImage = (address: string): string => {
  const member = teamStore.currentTeam?.members.find(
    (m: ExtendedMember) => m.address.toLowerCase() === address.toLowerCase()
  )
  return member?.imageUrl || ''
}

// Add new helper functions
const isContract = (address: string) => {
  return currentTeam.value?.teamContracts.some(
    (c) => c.address.toLowerCase() === address.toLowerCase()
  )
}

const getContractType = (address: string) => {
  const contract = currentTeam.value?.teamContracts.find(
    (c) => c.address.toLowerCase() === address.toLowerCase()
  )
  if (!contract) return { type: address, icon: 'heroicons-outline:cube' }

  const typeMap: Record<string, { type: string; icon: string }> = {
    CashRemunerationEIP712: {
      type: 'Cash Remuneration Contract',
      icon: 'heroicons-outline:currency-dollar'
    },
    Bank: { type: 'Bank Contract', icon: 'heroicons-outline:banknotes' },
    ExpenseAccountEIP712: { type: 'Expense Account Contract', icon: 'heroicons-outline:briefcase' }
  }

  return (
    typeMap[contract.type] || { type: `${contract.type} Contract`, icon: 'heroicons-outline:cube' }
  )
}

const getMemberName = (address: string) => {
  const member = currentTeam.value?.members.find(
    (m) => m.address.toLowerCase() === address.toLowerCase()
  )
  return member?.name || address
}
</script>

<style scoped></style>
