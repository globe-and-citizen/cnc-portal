<template>
  <GenericTransactionHistory
    :transactions="transactionData"
    title="Cash Remeration Transactions History"
    :currencies="currencies"
    :show-receipt-modal="true"
    :show-export="false"
    data-test-prefix="cash-remeration-transaction-history"
  />
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useQuery } from '@vue/apollo-composable'
import { zeroAddress } from 'viem'
import GenericTransactionHistory from '@/components/GenericTransactionHistory.vue'
import { GRAPHQL_POLL_INTERVAL } from '@/constant'
import { useCurrencyStore, useTeamStore } from '@/stores'
import { GET_CASH_REMUNERATION_EVENTS } from '@/queries/ponder/cash-remuneration.queries'
import type {
  CashRemunerationEventsQuery,
  RawCashRemerationTransaction
} from '@/types/ponder/cash-remuneration'
import type { CashRemunerationTransaction } from '@/types/transactions'
import { formatEtherUtil, log, tokenSymbol } from '@/utils'

const teamStore = useTeamStore()
const currencyStore = useCurrencyStore()

const currencies = computed(() => {
  const defaultCurrency = currencyStore.localCurrency?.code
  return defaultCurrency === 'USD' ? ['USD'] : ['USD', defaultCurrency]
})

const contractAddress = (
  teamStore.getContractAddressByType('CashRemunerationEIP712') || ''
).toLowerCase()

const txHashFromId = (id: string): string => {
  const [txHash] = id.split('-')
  return txHash ?? id
}

const parseAmount = (value: string): bigint => {
  try {
    return BigInt(value)
  } catch {
    return 0n
  }
}

const { result, error } = useQuery<CashRemunerationEventsQuery>(
  GET_CASH_REMUNERATION_EVENTS,
  {
    contractAddress,
    limit: 500
  },
  {
    enabled: Boolean(contractAddress),
    pollInterval: GRAPHQL_POLL_INTERVAL,
    fetchPolicy: 'cache-and-network'
  }
)

const rawTransactions = computed<RawCashRemerationTransaction[]>(() => {
  const deposits = result.value?.cashRemunerationDeposits?.items ?? []
  const withdraws = result.value?.cashRemunerationWithdraws?.items ?? []
  const withdrawTokens = result.value?.cashRemunerationWithdrawTokens?.items ?? []
  const ownerWithdrawNatives =
    result.value?.cashRemunerationOwnerTreasuryWithdrawNatives?.items ?? []
  const ownerWithdrawTokens = result.value?.cashRemunerationOwnerTreasuryWithdrawTokens?.items ?? []
  const tokenSupportAddeds = result.value?.cashRemunerationTokenSupportAddeds?.items ?? []

  const merged: RawCashRemerationTransaction[] = [
    ...deposits.map((row) => ({
      txHash: txHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.depositor,
      to: row.contractAddress,
      amount: row.amount,
      tokenAddress: zeroAddress,
      type: 'deposit' as const
    })),
    ...withdraws.map((row) => ({
      txHash: txHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.contractAddress,
      to: row.withdrawer,
      amount: row.amount,
      tokenAddress: zeroAddress,
      type: 'withdraw' as const
    })),
    ...withdrawTokens.map((row) => ({
      txHash: txHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.contractAddress,
      to: row.withdrawer,
      amount: row.amount,
      tokenAddress: row.tokenAddress,
      type: 'withdrawToken' as const
    })),
    ...ownerWithdrawNatives.map((row) => ({
      txHash: txHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.contractAddress,
      to: row.ownerAddress,
      amount: row.amount,
      tokenAddress: zeroAddress,
      type: 'ownerTreasuryWithdrawNative' as const
    })),
    ...ownerWithdrawTokens.map((row) => ({
      txHash: txHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.contractAddress,
      to: row.ownerAddress,
      amount: row.amount,
      tokenAddress: row.tokenAddress,
      type: 'ownerTreasuryWithdrawToken' as const
    })),
    ...tokenSupportAddeds.map((row) => ({
      txHash: txHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.contractAddress,
      to: row.tokenAddress,
      amount: '0',
      tokenAddress: row.tokenAddress,
      type: 'tokenSupportAdded' as const
    }))
  ]

  return merged.sort((a, b) => b.timestamp - a.timestamp)
})

const transactionData = computed<CashRemunerationTransaction[]>(() =>
  rawTransactions.value.map((tx) => ({
    txHash: tx.txHash,
    date: new Date(tx.timestamp * 1000).toLocaleString('en-US'),
    from: tx.from,
    to: tx.to,
    amount: formatEtherUtil(parseAmount(tx.amount), tx.tokenAddress),
    amountUSD: 0,
    token: tokenSymbol(tx.tokenAddress) || 'ERC20',
    type: tx.type
  }))
)

watch(error, (newError) => {
  if (newError) {
    log.error('Ponder cash remuneration transaction query error:', newError)
  }
})
</script>
