<template>
  <UCard class="w-full" data-test="bank-transactions">
    <template #header>
      <div class="flex items-center justify-between">
        <span>Bank Transactions History</span>
        <div class="flex items-center gap-2">
          <CustomDatePicker
            v-model="dateRange"
            class="min-w-[140px]"
            data-test-prefix="bank-transaction-history"
          />
          <USelect
            v-model="selectedType"
            :items="typeOptions"
            class="min-w-[160px]"
            data-test="bank-transaction-history-type-filter"
          />
        </div>
      </div>
    </template>

    <UTable :data="displayedTransactions" :columns="columns" :loading="loading">
      <template #txHash-cell="{ row: { original: row } }">
        <AddressToolTip :address="row.txHash" :slice="true" type="transaction" />
      </template>

      <template #date-cell="{ row: { original: row } }">
        {{ formatDateShort(String(row.date)) }}
      </template>

      <template #type-cell="{ row: { original: row } }">
        <UBadge :color="getBankTransactionTypeColor(row.type)" variant="soft">
          {{ row.type }}
        </UBadge>
      </template>

      <template #from-cell="{ row: { original: row } }">
        <AddressToolTip :address="row.from" :slice="true" type="address" />
      </template>

      <template #to-cell="{ row: { original: row } }">
        <AddressToolTip :address="row.to" :slice="true" type="address" />
      </template>

      <template #amount-cell="{ row: { original: row } }">
        {{ formatCryptoAmount(row.amount) }} {{ row.token }}
      </template>

      <template #valueLocal-cell="{ row: { original: row } }">
        {{ formatCurrencyShort(row.amountLocal, currencyStore.localCurrency.code) }}
      </template>
    </UTable>
  </UCard>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { zeroAddress, type Address } from 'viem'
import type { TokenId } from '@/constant'
import { GRAPHQL_POLL_INTERVAL, NETWORK } from '@/constant'
import { useQuery } from '@vue/apollo-composable'
import AddressToolTip from '@/components/AddressToolTip.vue'
import CustomDatePicker from '@/components/CustomDatePicker.vue'
import { useCurrencyStore } from '@/stores/currencyStore'
import type { BankTransaction } from '@/types/transactions'
import {
  buildRawBankTransactions,
  formatBankTransactionDate,
  getBankTransactionTypeColor,
  formatCryptoAmount,
  formatCurrencyShort,
  formatEtherUtil,
  getTokenAddress,
  log,
  tokenSymbol
} from '@/utils'
import { formatDateShort } from '@/utils/dayUtils'
import { GET_BANK_EVENTS } from '@/queries/ponder/bank.queries'
import type { BankEventsQuery } from '@/types/ponder/bank'

const props = defineProps<{
  bankAddress: Address
}>()

const currencyStore = useCurrencyStore()
const contractAddress = computed(() => props.bankAddress.toLowerCase())

const { result, error, loading } = useQuery<BankEventsQuery>(
  GET_BANK_EVENTS,
  {
    contractAddress,
    limit: 500
  },
  {
    enabled: computed(() => Boolean(contractAddress.value)),
    pollInterval: GRAPHQL_POLL_INTERVAL,
    fetchPolicy: 'cache-and-network'
  }
)

const parseAmount = (value: string): bigint => {
  try {
    return BigInt(value)
  } catch {
    return 0n
  }
}

const rawTransactions = computed(() => buildRawBankTransactions(result.value))

const transactions = computed<BankTransaction[]>(() =>
  rawTransactions.value.map((row) => ({
    txHash: row.txHash,
    date: formatBankTransactionDate(Number(row.timestamp)),
    from: row.from,
    to: row.to,
    amount: formatEtherUtil(parseAmount(row.amount), row.tokenAddress),
    amountUSD: 0,
    tokenAddress: row.tokenAddress,
    token: tokenSymbol(row.tokenAddress) || 'ERC20',
    type: row.type
  }))
)

const dateRange = ref<[Date, Date] | null>(null)
const selectedType = ref('all')

type BankTransactionRow = BankTransaction & {
  amount: string | number
  token: string
  tokenAddress: string
  amountLocal: number
}

const KNOWN_TOKEN_IDS: TokenId[] = ['native', 'usdc', 'usdc.e', 'usdt', 'sher']

const resolveTokenIdByAddress = (tokenAddress: string): TokenId | null => {
  const normalizedAddress = tokenAddress.toLowerCase()
  const knownId = KNOWN_TOKEN_IDS.find((tokenId) => {
    const knownAddress = (getTokenAddress(tokenId) ?? zeroAddress).toLowerCase()
    return knownAddress === normalizedAddress
  })

  return knownId ?? null
}

const enrichedTransactions = computed<BankTransactionRow[]>(() => {
  return transactions.value.map((tx) => {
    const tokenAddress = String(tx.tokenAddress ?? '').toLowerCase()
    const matchedToken = currencyStore.supportedTokens.find(
      (token) => token.address.toLowerCase() === tokenAddress
    )

    const token =
      matchedToken?.symbol || tokenSymbol(tokenAddress) || tx.token || NETWORK.currencySymbol
    const tokenId = matchedToken?.id ?? resolveTokenIdByAddress(tokenAddress)
    const amount = tx.amount ?? 0
    const numericAmount = Number(amount)
    const priceInLocal = tokenId ? currencyStore.getTokenPrice(tokenId, true) : 0
    const amountLocal = Number.isFinite(numericAmount) ? numericAmount * priceInLocal : 0

    return {
      ...tx,
      amount,
      tokenAddress,
      token,
      amountLocal
    }
  })
})

const uniqueTypes = computed(() => {
  const types = new Set(enrichedTransactions.value.map((tx) => tx.type))
  return Array.from(types).sort()
})

const typeOptions = computed(() => [
  { label: 'All Types', value: 'all' },
  ...uniqueTypes.value.map((type) => ({ label: type, value: type }))
])

const displayedTransactions = computed(() => {
  let filtered = enrichedTransactions.value

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

const columns = computed(() => [
  { accessorKey: 'txHash', header: 'Tx Hash' },
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'from', header: 'From' },
  { accessorKey: 'to', header: 'To' },
  { accessorKey: 'amount', header: 'Amount' },
  { accessorKey: 'valueLocal', header: `Value (${currencyStore.localCurrency.code})` }
])

watch(error, (newError) => {
  if (newError) {
    log.error('Ponder bank transaction query error:', newError)
  }
})
</script>
