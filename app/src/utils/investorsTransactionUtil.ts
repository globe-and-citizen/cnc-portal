import type {
  InvestorEventsQuery,
  RawInvestorTransaction,
  SafeDepositRouterEventsQuery
} from '@/types/ponder/investor'
import type { InvestorsTransaction } from '@/types/transactions'
import type { TokenId } from '@/constant'
import type { UBadgeColor } from '@/types/ui'
import { NETWORK } from '@/constant'
import { zeroAddress } from 'viem'
import { buildRawTransactions, extractTxHashFromId } from './rawTransactionsUtil'
import { tokenSymbol, formatEtherUtil, resolveTokenIdByAddress } from './constantUtil'
import { parseBigIntOrZero } from './transactionHistoryUtil'
import { formatSafeDepositRouterMultiplier } from './safeDepositRouterUtil'
import { useCurrencyStore } from '@/stores/currencyStore'

export const buildRawInvestorTransactions = (
  investorResult?: InvestorEventsQuery | null,
  safeResult?: SafeDepositRouterEventsQuery | null
): RawInvestorTransaction[] => {
  const mints = investorResult?.investorMints?.items ?? []
  const distributed = investorResult?.investorDividendDistributeds?.items ?? []
  const paids = investorResult?.investorDividendPaids?.items ?? []
  const faileds = investorResult?.investorDividendPaymentFaileds?.items ?? []
  const safeDeposits = safeResult?.safeDeposits?.items ?? []
  const safeDepositsEnableds = safeResult?.safeDepositsEnableds?.items ?? []
  const safeDepositsDisableds = safeResult?.safeDepositsDisableds?.items ?? []
  const safeAddressUpdateds = safeResult?.safeAddressUpdateds?.items ?? []
  const safeMultiplierUpdateds = safeResult?.safeMultiplierUpdateds?.items ?? []

  const sections: RawInvestorTransaction[][] = [
    mints.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.contractAddress,
      to: row.shareholder,
      amount: row.amount,
      tokenAddress: row.contractAddress,
      transactionType: 'mint' as const
    })),
    distributed.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.distributor,
      to: row.contractAddress,
      amount: row.totalAmount,
      tokenAddress: row.token,
      transactionType: 'dividendDistributed' as const
    })),
    paids.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.contractAddress,
      to: row.shareholder,
      amount: row.amount,
      tokenAddress: row.token,
      transactionType: 'dividendPaid' as const
    })),
    faileds.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.contractAddress,
      to: row.shareholder,
      amount: row.amount,
      tokenAddress: row.token,
      transactionType: 'dividendPaymentFailed' as const,
      reason: row.reason
    })),
    safeDeposits.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.depositor,
      to: row.contractAddress,
      amount: row.tokenAmount,
      tokenAddress: row.token,
      transactionType: 'safeDeposit' as const
    })),
    safeDepositsEnableds.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.enabledBy,
      to: row.contractAddress,
      amount: '0',
      tokenAddress: zeroAddress,
      transactionType: 'safeDepositsEnabled' as const
    })),
    safeDepositsDisableds.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.disabledBy,
      to: row.contractAddress,
      amount: '0',
      tokenAddress: zeroAddress,
      transactionType: 'safeDepositsDisabled' as const
    })),
    safeAddressUpdateds.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.oldSafe,
      to: row.newSafe,
      amount: '0',
      tokenAddress: zeroAddress,
      transactionType: 'safeAddressUpdated' as const
    })),
    safeMultiplierUpdateds.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.contractAddress,
      to: row.contractAddress,
      amount: row.newMultiplier,
      tokenAddress: zeroAddress,
      transactionType: 'safeMultiplierUpdated' as const
    }))
  ]

  return buildRawTransactions(sections)
}

export const formatInvestorTransactionDate = (timestamp: number): string =>
  new Date(timestamp * 1000).toLocaleString('en-US')

export const mapRawInvestorTransaction = (
  tx: RawInvestorTransaction,
  investorTokenSymbol: string,
  getUsdPrice: (tokenId: TokenId | null) => number
): InvestorsTransaction => {
  const currencyStore = useCurrencyStore()
  const isConfigEvent =
    tx.transactionType === 'safeDepositsEnabled' ||
    tx.transactionType === 'safeDepositsDisabled' ||
    tx.transactionType === 'safeAddressUpdated'
  const isMultiplierEvent = tx.transactionType === 'safeMultiplierUpdated'
  const tokenAddress = String(tx.tokenAddress ?? '').toLowerCase()
  const matchedToken = currencyStore.supportedTokens.find(
    (t) => t.address.toLowerCase() === tokenAddress
  )
  const token = isConfigEvent
    ? '-'
    : isMultiplierEvent
      ? 'x'
      : tx.transactionType === 'mint'
        ? investorTokenSymbol
        : matchedToken?.symbol ||
          tokenSymbol(tokenAddress) ||
          investorTokenSymbol ||
          NETWORK.currencySymbol
  const amount = isConfigEvent
    ? '0'
    : isMultiplierEvent
      ? formatSafeDepositRouterMultiplier(parseBigIntOrZero(tx.amount), 6)
      : formatEtherUtil(parseBigIntOrZero(tx.amount), tx.tokenAddress)
  const tokenId =
    isConfigEvent || isMultiplierEvent
      ? null
      : (matchedToken?.id ?? resolveTokenIdByAddress(tokenAddress))
  const numericAmount = Number(amount)
  const amountUSD = Number.isFinite(numericAmount) ? numericAmount * getUsdPrice(tokenId) : 0
  return {
    txHash: tx.txHash,
    date: formatInvestorTransactionDate(tx.timestamp),
    from: tx.from,
    to: tx.to,
    amount,
    amountUSD: amountUSD || 0,
    token,
    tokenAddress,
    type: tx.transactionType,
    reason: tx.reason
  }
}

export const getInvestorTransactionTypeColor = (type: string): UBadgeColor => {
  const normalizedType = type.toLowerCase()

  if (normalizedType.includes('mint') || normalizedType.includes('paid')) return 'success'
  if (normalizedType.includes('distributed')) return 'warning'
  if (normalizedType.includes('failed')) return 'error'
  if (normalizedType.includes('transfer')) return 'info'
  return 'neutral'
}
