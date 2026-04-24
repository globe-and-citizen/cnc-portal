import type { BankEventsQuery, RawBankTransaction } from '@/types/ponder/bank'
import { zeroAddress } from 'viem'
import { buildRawTransactions, extractTxHashFromId } from './rawTransactionsUtil'

type UBadgeColor = 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'

export const buildRawBankTransactions = (
  bankResult?: BankEventsQuery | null
): RawBankTransaction[] => {
  const deposits = bankResult?.bankDeposits?.items ?? []
  const tokenDeposits = bankResult?.bankTokenDeposits?.items ?? []
  const transfers = bankResult?.bankTransfers?.items ?? []
  const tokenTransfers = bankResult?.bankTokenTransfers?.items ?? []
  const dividends = bankResult?.bankDividendDistributionTriggereds?.items ?? []
  const fees = bankResult?.bankFeePaids?.items ?? []
  const rawTokenTransfers = bankResult?.rawContractTokenTransfers?.items ?? []

  const sections: RawBankTransaction[][] = [
    deposits.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.depositor,
      to: row.contractAddress,
      amount: row.amount,
      tokenAddress: zeroAddress,
      type: 'deposit'
    })),
    tokenDeposits.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.depositor,
      to: row.contractAddress,
      amount: row.amount,
      tokenAddress: row.token,
      type: 'tokenDeposit'
    })),
    transfers.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.sender,
      to: row.to,
      amount: row.amount,
      tokenAddress: zeroAddress,
      type: 'transfer'
    })),
    tokenTransfers.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.sender,
      to: row.to,
      amount: row.amount,
      tokenAddress: row.token,
      type: 'tokenTransfer'
    })),
    dividends.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.contractAddress,
      to: row.investor,
      amount: row.totalAmount,
      tokenAddress: row.token,
      type: 'dividendDistribution'
    })),
    fees.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.contractAddress,
      to: row.feeCollector,
      amount: row.amount,
      tokenAddress: row.token ?? zeroAddress,
      type: 'feePaid'
    })),
    rawTokenTransfers.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.from,
      to: row.to,
      amount: row.amount,
      tokenAddress: row.tokenAddress,
      type:
        row.direction === 'in'
          ? 'rawTokenIn'
          : row.direction === 'out'
            ? 'rawTokenOut'
            : 'rawTokenInternal'
    }))
  ]

  return buildRawTransactions(sections)
}

export const formatBankTransactionDate = (timestamp: number): string =>
  new Date(timestamp * 1000).toLocaleString('en-US')

export const getBankTransactionTypeColor = (type: string): UBadgeColor => {
  const normalizedType = type.toLowerCase()

  if (normalizedType.includes('deposit')) return 'success'
  if (normalizedType.includes('transfer') || normalizedType.includes('raw')) return 'info'
  if (normalizedType.includes('dividend')) return 'warning'
  if (normalizedType.includes('fee')) return 'error'
  return 'neutral'
}
