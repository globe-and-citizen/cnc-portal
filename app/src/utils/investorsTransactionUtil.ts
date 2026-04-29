import type {
  InvestorEventsQuery,
  RawInvestorTransaction,
  SafeDepositRouterEventsQuery
} from '@/types/ponder/investor'
import { zeroAddress } from 'viem'
import { buildRawTransactions, extractTxHashFromId } from './rawTransactionsUtil'

type UBadgeColor = 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'

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

export const getInvestorTransactionTypeColor = (type: string): UBadgeColor => {
  const normalizedType = type.toLowerCase()

  if (normalizedType.includes('mint') || normalizedType.includes('paid')) return 'success'
  if (normalizedType.includes('distributed')) return 'warning'
  if (normalizedType.includes('failed')) return 'error'
  if (normalizedType.includes('transfer')) return 'info'
  return 'neutral'
}
