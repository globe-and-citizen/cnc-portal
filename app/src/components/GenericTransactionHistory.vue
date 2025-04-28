<!-- GenericTransactionHistory.vue -->
<template>
  <CardComponent :title="title" class="w-full">
    <template #card-action>
      <div class="flex items-center gap-10">
        <CustomDatePicker
          v-if="showDateFilter"
          v-model="dateRange"
          :data-test-prefix="dataTestPrefix"
        />
        <ButtonUI
          v-if="showExport"
          variant="success"
          @click="handleExport"
          :data-test="`${dataTestPrefix}-export-button`"
          >Export</ButtonUI
        >
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
      <template #pagination-info="{ startIndex, endIndex, totalItems }">
        <div class="text-sm text-gray-600">
          Showing transactions {{ startIndex + 1 }} to {{ endIndex }} of {{ totalItems }}
        </div>
      </template>

      <template #txHash-data="{ row }">
        <AddressToolTip
          :address="(row as BaseTransaction).txHash"
          :slice="true"
          type="transaction"
        />
      </template>

      <template #date-data="{ row }">{{ formatDate((row as BaseTransaction).date) }}</template>

      <template #type-data="{ row }">
        <span class="badge" :class="getTypeClass((row as BaseTransaction).type)">{{
          (row as BaseTransaction).type
        }}</span>
      </template>

      <template #from-data="{ row }">
        <template v-if="isContract((row as BaseTransaction).from)">
          <a
            :href="getExplorerUrl((row as BaseTransaction).from)"
            target="_blank"
            class="flex items-center gap-2 text-emerald-600 hover:text-emerald-800 hover:underline transition-colors duration-200"
          >
            <IconifyIcon
              :icon="getContractType((row as BaseTransaction).from).icon"
              class="w-5 h-5"
            />
            <span class="font-medium">{{
              getContractType((row as BaseTransaction).from).type
            }}</span>
          </a>
        </template>
        <UserComponent v-else :user="getUserData((row as BaseTransaction).from)" />
      </template>

      <template #to-data="{ row }">
        <template v-if="isContract((row as BaseTransaction).to)">
          <a
            :href="getExplorerUrl((row as BaseTransaction).to)"
            target="_blank"
            class="flex items-center gap-2 text-emerald-600 hover:text-emerald-800 hover:underline transition-colors duration-200"
          >
            <IconifyIcon
              :icon="getContractType((row as BaseTransaction).to).icon"
              class="w-5 h-5"
            />
            <span class="font-medium">{{ getContractType((row as BaseTransaction).to).type }}</span>
          </a>
        </template>
        <UserComponent v-else :user="getUserData((row as BaseTransaction).to)" />
      </template>

      <template #receipt-data="{ row }">
        <template v-if="showReceiptModal">
          <ButtonUI
            size="sm"
            @click="handleReceiptClick(row as BaseTransaction)"
            :data-test="`${dataTestPrefix}-receipt-button`"
            >Receipt</ButtonUI
          >
        </template>
        <a
          v-else
          :href="getReceiptUrl((row as BaseTransaction).txHash)"
          target="_blank"
          class="text-primary hover:text-primary-focus transition-colors duration-200 flex items-center gap-2"
        >
          <IconifyIcon icon="heroicons-outline:document-text" class="h-4 w-4" />Receipt
        </a>
      </template>

      <template #amount-data="{ row }"
        >{{ Number((row as BaseTransaction).amount) }}
        {{ (row as BaseTransaction).token }}</template
      >
      <template #valueUSD-data="{ row }">{{
        formatAmount(row as BaseTransaction, 'USD')
      }}</template>
      <template #valueLocal-data="{ row }">{{
        formatAmount(row as BaseTransaction, currencyStore.currency.code)
      }}</template>
    </TableComponent>

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
  currencies: string[]
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
const currencyStore = useCurrencyStore()
const teamStore = useTeamStore()
const route = useRoute()
const { nativeTokenPriceInUSD, nativeTokenPrice } = storeToRefs(currencyStore)
const { currentTeam } = storeToRefs(teamStore)

const dateRange = ref<[Date, Date] | null>(null)
const receiptModal = ref(false)
const selectedTransaction = ref<BaseTransaction | null>(null)
const currentPage = ref(1)
const itemsPerPage = ref(10)

onMounted(async () => {
  const teamId = route.params.id as string
  if (teamId && (!currentTeam.value || currentTeam.value.id !== teamId)) {
    await teamStore.setCurrentTeamId(teamId)
  }
})

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

const displayedTransactions = computed(() => {
  if (!dateRange.value) return props.transactions
  const [startDate, endDate] = dateRange.value
  return props.transactions.filter((tx) => {
    const txDate = new Date(tx.date)
    return txDate >= startDate && txDate <= endDate
  })
})

const formatDate = (date: string | number) => {
  try {
    const dateObj = typeof date === 'number' ? new Date(date) : new Date(date)
    if (!isNaN(dateObj.getTime())) return dateObj.toLocaleString()
    const timestamp = parseInt(date as string) * 1000
    const timestampDate = new Date(timestamp)
    return !isNaN(timestampDate.getTime()) ? timestampDate.toLocaleString() : 'Invalid Date'
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Invalid Date'
  }
}

const formatAmount = (transaction: BaseTransaction, currency: string) => {
  const tokenAmount = Number(transaction.amount)
  if (tokenAmount <= 0) return currency === 'USD' ? '$0.00' : '0.00'
  const usdAmount =
    transaction.token === 'USDC' ? tokenAmount : tokenAmount * nativeTokenPriceInUSD.value!
  const formatter = Intl.NumberFormat('en-US', { style: 'currency', currency })
  return currency === 'USD'
    ? formatter.format(usdAmount)
    : formatter.format(usdAmount * (nativeTokenPrice.value! / nativeTokenPriceInUSD.value!))
}

const handleExport = async () => {
  try {
    const headers = columns.value.map((col) => col.label)
    const rows = displayedTransactions.value.map((tx) =>
      columns.value.map((col) => {
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
            return col.key.startsWith('amount') ? formatAmount(tx, 'USD') : ''
        }
      })
    )

    const date = new Date().toISOString().split('T')[0]
    const [excelSuccess, pdfSuccess] = await Promise.all([
      exportTransactionsToExcel(headers, rows, date),
      exportTransactionsToPdf(headers, rows, date)
    ])

    toastStore.addSuccessToast(
      excelSuccess && pdfSuccess
        ? 'Transactions exported successfully'
        : 'Failed to export some transactions'
    )
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

const getReceiptUrl = (txHash: string) => `${NETWORK.blockExplorerUrl}/tx/${txHash}`
const getExplorerUrl = (address: string) => `${NETWORK.blockExplorerUrl}/address/${address}`

const formatReceiptData = (transaction: BaseTransaction): ReceiptData => ({
  txHash: String(transaction.txHash),
  date: formatDate(transaction.date),
  type: String(transaction.type),
  from: String(transaction.from),
  to: String(transaction.to),
  amount: String(transaction.amount || ''),
  token: String(transaction.token),
  amountUSD: Number(transaction.amountUSD || 0),
  valueUSD: formatAmount(transaction, 'USD'),
  valueLocal: formatAmount(transaction, currencyStore.currency.code)
})

const handleReceiptExport = (receiptData: ReceiptData) => {
  try {
    const success = exportReceiptToExcel(receiptData)
    toastStore.addSuccessToast(
      success ? 'Receipt exported successfully' : 'Failed to export receipt'
    )
  } catch (error) {
    console.error('Error exporting receipt:', error)
    toastStore.addErrorToast('Failed to export receipt')
  }
}

const handleReceiptPdfExport = async (receiptData: ReceiptData) => {
  try {
    const success = await exportReceiptToPdf(receiptData)
    toastStore.addSuccessToast(
      success ? 'Receipt PDF exported successfully' : 'Failed to export receipt PDF'
    )
  } catch (error) {
    console.error('Error exporting receipt PDF:', error)
    toastStore.addErrorToast('Failed to export receipt PDF')
  }
}

const getTypeClass = (type: string) => ({
  'badge-success': type.toLowerCase() === 'deposit',
  'badge-info': type.toLowerCase() === 'transfer'
})

const typeMap: Record<string, { type: string; icon: string }> = {
  CashRemunerationEIP712: {
    type: 'Cash Remuneration Contract',
    icon: 'heroicons-outline:currency-dollar'
  },
  Bank: { type: 'Bank Contract', icon: 'heroicons-outline:banknotes' },
  ExpenseAccountEIP712: { type: 'Expense Account Contract', icon: 'heroicons-outline:briefcase' }
}

const getContractType = (address: string) => {
  const contract = currentTeam.value?.teamContracts.find(
    (c) => c.address.toLowerCase() === address.toLowerCase()
  )
  if (!contract) return { type: address, icon: 'heroicons-outline:cube' }
  return (
    typeMap[contract.type] || { type: `${contract.type} Contract`, icon: 'heroicons-outline:cube' }
  )
}

const isContract = (address: string) =>
  currentTeam.value?.teamContracts.some((c) => c.address.toLowerCase() === address.toLowerCase())

const getUserData = (address: string) => ({
  name: getMemberName(address),
  imageUrl: getMemberImage(address),
  address
})

const getMemberImage = (address: string) => {
  const member = currentTeam.value?.members.find(
    (m) => m.address.toLowerCase() === address.toLowerCase()
  )
  return member?.imageUrl || ''
}

const getMemberName = (address: string) => {
  const member = currentTeam.value?.members.find(
    (m) => m.address.toLowerCase() === address.toLowerCase()
  )
  return member?.name || address
}
</script>
