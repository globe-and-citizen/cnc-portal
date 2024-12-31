<template>
  <div class="flex flex-col gap-y-4 py-6 lg:px-4 sm:px-6">
    <span class="text-2xl sm:text-3xl font-bold">Transaction Invoices</span>
    <div class="divider m-0"></div>

    <!-- Date Range Filter -->
    <div class="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="form-control">
          <label class="label">
            <span class="label-text">From Date</span>
          </label>
          <input type="date" v-model="fromDate" class="input input-bordered" :max="toDate" />
        </div>
        <div class="form-control">
          <label class="label">
            <span class="label-text">To Date</span>
          </label>
          <input type="date" v-model="toDate" class="input input-bordered" :min="fromDate" />
        </div>
        <div class="form-control">
          <label class="label">
            <span class="label-text">Currency</span>
          </label>
          <select v-model="selectedCurrency" class="select select-bordered">
            <option value="USD">USD</option>
            <option value="INR">INR</option>
            <option value="CAD">CAD</option>
          </select>
        </div>
      </div>
      <div class="flex gap-2">
        <button
          class="btn btn-primary"
          @click="downloadPDF"
          :disabled="loading || !hasTransactions"
        >
          Download PDF
        </button>
        <button
          class="btn btn-primary"
          @click="downloadExcel"
          :disabled="loading || !hasTransactions"
        >
          Download Excel
        </button>
      </div>
    </div>

    <!-- Transactions Table -->
    <div class="overflow-x-auto bg-base-100">
      <SkeletonLoading v-if="loading" class="w-full h-96" />
      <table v-else class="table table-zebra w-full">
        <thead>
          <tr class="font-bold text-lg">
            <th>Date</th>
            <th>Type</th>
            <th>From</th>
            <th>To</th>
            <th>Amount</th>
            <th>Price ({{ selectedCurrency }})</th>
            <th>Transaction Hash</th>
          </tr>
        </thead>
        <tbody v-if="paginatedTransactions.length">
          <tr
            v-for="tx in paginatedTransactions"
            :key="tx.hash"
            class="hover cursor-pointer"
            @click="showTxDetail(tx.hash)"
          >
            <td>{{ formatDate(tx.date) }}</td>
            <td>{{ tx.type }}</td>
            <td class="truncate max-w-32">{{ formatAddress(tx.from, true) }}</td>
            <td class="truncate max-w-32">{{ formatAddress(tx.to, true) }}</td>
            <td>{{ formatAmount(tx).original }}</td>
            <td>{{ formatAmount(tx).convertedUSDC }}</td>
            <td class="truncate max-w-32">{{ tx.hash }}</td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr>
            <td colspan="6" class="text-center">No transactions found</td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 pb-4 px-4">
        <div class="flex items-center gap-2">
          <span class="text-sm">Items per page:</span>
          <select v-model="itemsPerPage" class="select select-bordered select-sm">
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>

        <div class="flex items-center gap-2">
          <button
            class="btn btn-sm btn-outline"
            :disabled="currentPage === 1"
            @click="currentPage = 1"
          >
            First
          </button>
          <button class="btn btn-sm" :disabled="currentPage === 1" @click="currentPage--">
            Previous
          </button>
          <div class="join">
            <button
              v-for="page in displayedPages"
              :key="page"
              class="join-item btn btn-sm"
              :class="{ 'btn-active': page === currentPage }"
              @click="currentPage = Number(page)"
            >
              {{ page }}
            </button>
          </div>
          <button class="btn btn-sm" :disabled="currentPage === totalPages" @click="currentPage++">
            Next
          </button>
          <button
            class="btn btn-sm btn-outline"
            :disabled="currentPage === totalPages"
            @click="currentPage = totalPages"
          >
            Last
          </button>
        </div>

        <div class="text-sm">
          Page {{ currentPage }} of {{ totalPages }} ({{ filteredTransactions.length }} items)
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useToastStore } from '@/stores/useToastStore'
import { NETWORK } from '@/constant'
import SkeletonLoading from '@/components/SkeletonLoading.vue'
import { formatEther, type Address } from 'viem'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import * as XLSX from 'xlsx'
import type { Team } from '@/types'

interface Transaction {
  type: 'Deposit' | 'Deposit Token' | 'Transfer' | 'Transfer Token'
  from: string
  to: string
  amount: bigint
  hash: string
  date: number
  isToken?: boolean
}

interface TokenTx {
  blockNumber: string
  timeStamp: string
  hash: string
  from: string
  to: string
  value: string
  contractAddress: string
  functionName: string
  tokenName: string
  tokenSymbol: string
}

interface ExchangeRates {
  [key: string]: {
    [date: string]: number
  }
}

const props = defineProps<{
  team: Partial<Team>
}>()

const { addErrorToast, addSuccessToast } = useToastStore()

// State
const loading = ref(false)
const currentPage = ref(1)
const itemsPerPage = ref(10)
const fromDate = ref('')
const toDate = ref(new Date().toISOString().split('T')[0])
const allTransactions = ref<Transaction[]>([])
const selectedCurrency = ref('USD')
const exchangeRates = ref<ExchangeRates>({
  USD: {},
  INR: {},
  CAD: {}
})

// Computed
const filteredTransactions = computed(() => {
  let filtered = [...allTransactions.value]

  if (fromDate.value) {
    filtered = filtered.filter((tx) => new Date(tx.date) >= new Date(fromDate.value))
  }
  if (toDate.value) {
    filtered = filtered.filter((tx) => new Date(tx.date) <= new Date(toDate.value))
  }

  return filtered.sort((a, b) => b.date - a.date)
})

const totalPages = computed(() => Math.ceil(filteredTransactions.value.length / itemsPerPage.value))
const hasTransactions = computed(() => filteredTransactions.value.length > 0)

const paginatedTransactions = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredTransactions.value.slice(start, end)
})

const displayedPages = computed(() => {
  const delta = 2
  const range = []
  const rangeWithDots: (number | string)[] = []
  let l: number | undefined

  for (let i = 1; i <= totalPages.value; i++) {
    if (
      i === 1 ||
      i === totalPages.value ||
      (i >= currentPage.value - delta && i <= currentPage.value + delta)
    ) {
      range.push(i)
    }
  }

  range.forEach((i) => {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1)
      } else if (i - l !== 1) {
        rangeWithDots.push('...')
      }
    }
    rangeWithDots.push(i)
    l = i
  })

  return rangeWithDots
})

// Methods
const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString()
}

const showTxDetail = (txHash: string) => {
  window.open(`${NETWORK.blockExplorerUrl}/tx/${txHash}`, '_blank')
}

const fetchExchangeRates = async (date: string) => {
  try {
    const params = new URLSearchParams({
      apikey: 'fca_live_Ee3QsIH2QQUw3WCNypXcgeFzPXSxkWw1iEywJCeh',
      date,
      base_currency: 'USD',
      currencies: `USD,${selectedCurrency.value}`
    })
    const link = `https://api.freecurrencyapi.com/v1/historical?${params}`

    const response = await fetch(link, {
      method: 'GET'
    })
    const data = await response.json()
    if (data.data && data.data[date]) {
      exchangeRates.value[selectedCurrency.value][date] = data.data[date][selectedCurrency.value]
    }
  } catch (error) {
    console.error('Error fetching exchange rates:', error)
  }
}

const formatAmount = (tx: Transaction) => {
  let baseAmount: number
  let symbol: string

  if (tx.isToken) {
    baseAmount = Number(tx.amount) / 1e6
    symbol = 'USDC'
  } else {
    baseAmount = Number(formatEther(tx.amount))
    symbol = NETWORK.currencySymbol
  }

  const txDate = new Date(tx.date).toISOString().split('T')[0]
  const rate = exchangeRates.value[selectedCurrency.value]?.[txDate] || 1

  const convertedAmount = baseAmount * rate
  const convertedUSDC = tx.isToken ? convertedAmount : baseAmount

  return {
    original: `${baseAmount.toFixed(2)} ${symbol}`,
    converted: `${convertedAmount.toFixed(2)} ${selectedCurrency.value}`,
    convertedUSDC: `${convertedUSDC.toFixed(2)} ${selectedCurrency.value}`
  }
}

const formatAddress = (address: string, truncate = true) => {
  if (!props.team.members)
    return truncate ? `${address.slice(0, 6)}...${address.slice(-4)}` : address

  const member = props.team.members.find((m) => m.address.toLowerCase() === address.toLowerCase())
  if (member) {
    return `${member.name} (${truncate ? `${address.slice(0, 6)}...${address.slice(-4)}` : address})`
  }
  return truncate ? `${address.slice(0, 6)}...${address.slice(-4)}` : address
}

const fetchTransactions = async () => {
  loading.value = true
  try {
    const addresses = [
      props.team.bankAddress?.toLowerCase(),
      props.team.expenseAccountAddress?.toLowerCase(),
      props.team.cashRemunerationEip712Address?.toLowerCase()
    ].filter(Boolean) as Address[]

    if (addresses.length === 0) return

    const chainId = Number(NETWORK.chainId)

    // Fetch both normal and token transactions
    const allTxPromises = addresses.map(async (address) => {
      const tokenParams = new URLSearchParams({
        module: 'account',
        chainId: chainId.toString(),
        action: 'tokentx',
        address,
        startblock: '0',
        endblock: '99999999',
        page: '1',
        offset: '1000',
        sort: 'desc',
        apikey: import.meta.env.VITE_ETHERSCAN_API_KEY
      })

      const [tokenResponse] = await Promise.all([
        fetch(`https://api.etherscan.io/v2/api?${tokenParams}`)
      ])

      const [tokenData] = await Promise.all([tokenResponse.json()])
      // Process normal transactions

      // Process token transactions (these are always token transfers)
      const tokenTxs =
        tokenData.status === '1' && tokenData.result
          ? (tokenData.result as TokenTx[]).map((tx: TokenTx) => {
              return {
                type: addresses.includes(tx.to.toLowerCase() as Address)
                  ? ('Deposit Token' as const)
                  : ('Transfer Token' as const),
                from: tx.from,
                to: tx.to,
                amount: BigInt(tx.value),
                hash: tx.hash,
                date: Number(tx.timeStamp) * 1000,
                isToken: true
              } satisfies Transaction
            })
          : []

      return [...tokenTxs] as Transaction[]
    })

    const transactions = await Promise.all(allTxPromises)

    // Remove duplicates based on transaction hash
    const uniqueTxs = Array.from(new Map(transactions.flat().map((tx) => [tx.hash, tx])).values())

    allTransactions.value = uniqueTxs

    const uniqueDates = new Set(
      uniqueTxs.map((tx) => new Date(tx.date).toISOString().split('T')[0])
    )

    for (const date of uniqueDates) {
      await fetchExchangeRates(date)
    }
  } catch (error) {
    console.error('Error fetching transactions:', error)
    addErrorToast('Failed to fetch transactions')
  } finally {
    loading.value = false
  }
}

const downloadPDF = () => {
  try {
    interface jsPDFInt {
      setFontSize: (size: number) => void
      text: (text: string, x: number, y: number) => void
      save: (filename: string) => void
      autoTable: (options: {
        head: string[][]
        body: string[][]
        startY: number
        styles: { fontSize: number }
        columnStyles: { [key: number]: { cellWidth: number } }
      }) => void
    }
    const doc: Partial<jsPDFInt> = new jsPDF()

    // Add title
    doc?.setFontSize?.(16)
    doc?.text?.('Transaction Invoice', 14, 15)

    // Add date range
    doc?.setFontSize?.(10)
    doc?.text?.(`Period: ${fromDate.value || 'All'} to ${toDate.value || 'All'}`, 14, 25)

    // Add table
    const tableData = filteredTransactions.value.map((tx) => [
      formatDate(tx.date),
      tx.type,
      formatAddress(tx.from, false),
      formatAddress(tx.to, false),
      formatAmount(tx).original,
      formatAmount(tx).convertedUSDC,
      tx.hash
    ])

    doc?.autoTable?.({
      head: [
        [
          'Date',
          'Type',
          'From',
          'To',
          'Amount',
          `Price (${selectedCurrency.value})`,
          'Transaction Hash'
        ]
      ],
      body: tableData,
      startY: 30,
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 20 },
        2: { cellWidth: 35 },
        3: { cellWidth: 35 },
        4: { cellWidth: 25 },
        5: { cellWidth: 45 }
      }
    })

    doc?.save?.('transaction-invoice.pdf')
    addSuccessToast('PDF downloaded successfully')
  } catch (error) {
    console.error('Error generating PDF:', error)
    addErrorToast('Failed to generate PDF')
  }
}

const downloadExcel = () => {
  try {
    const columnPrice = `Price (${selectedCurrency.value})`
    const data = filteredTransactions.value.map((tx) => ({
      Date: formatDate(tx.date),
      Type: tx.type,
      From: formatAddress(tx.from, false),
      To: formatAddress(tx.to, false),
      Amount: formatAmount(tx).original,
      [columnPrice]: formatAmount(tx).convertedUSDC,
      'Transaction Hash': tx.hash
    }))

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions')

    // Auto-size columns
    const max_width = data.reduce((w, r) => Math.max(w, r['Transaction Hash'].length), 10)
    worksheet['!cols'] = [
      { wch: 20 }, // Date
      { wch: 10 }, // Type
      { wch: 45 }, // From
      { wch: 45 }, // To
      { wch: 15 }, // Amount
      { wch: 45 }, // Converted Amount
      { wch: max_width } // Transaction Hash
    ]

    XLSX.writeFile(workbook, 'transaction-invoice.xlsx')
    addSuccessToast('Excel file downloaded successfully')
  } catch (error) {
    console.error('Error generating Excel:', error)
    addErrorToast('Failed to generate Excel file')
  }
}

// Watchers
watch([fromDate, toDate], () => {
  currentPage.value = 1
})

watch(itemsPerPage, () => {
  currentPage.value = 1
})

watch([selectedCurrency], async () => {
  // Fetch exchange rates for all transactions if they don't exist
  const uniqueDates = new Set(
    filteredTransactions.value.map((tx) => new Date(tx.date).toISOString().split('T')[0])
  )

  for (const date of uniqueDates) {
    if (!exchangeRates.value[selectedCurrency.value][date]) {
      await fetchExchangeRates(date)
    }
  }
})

// Lifecycle
onMounted(async () => {
  await fetchTransactions()
})
</script>
