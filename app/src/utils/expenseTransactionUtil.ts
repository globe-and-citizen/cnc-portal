import type { IncomingBankTokenTransfersQuery } from '@/types/ponder/bank'
import type { ExpenseEventsQuery, RawExpenseTransaction } from '@/types/ponder/expense'
import { zeroAddress } from 'viem'
import {
  buildRawTransactions,
  extractTxHashFromId,
  mapIncomingTransfersToTokenDeposits
} from './rawTransactionsUtil'

type UBadgeColor = 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'

export const buildRawExpenseTransactions = (
  expenseResult?: ExpenseEventsQuery | null,
  incomingTokenTransfersResult?: IncomingBankTokenTransfersQuery | null
): RawExpenseTransaction[] => {
  const deposits = expenseResult?.expenseDeposits?.items ?? []
  const tokenDeposits = expenseResult?.expenseTokenDeposits?.items ?? []
  const transfers = expenseResult?.expenseTransfers?.items ?? []
  const tokenTransfers = expenseResult?.expenseTokenTransfers?.items ?? []
  const approvals = expenseResult?.expenseApprovals?.items ?? []
  const ownerTreasuryWithdrawNatives =
    expenseResult?.expenseOwnerTreasuryWithdrawNatives?.items ?? []
  const ownerTreasuryWithdrawTokens = expenseResult?.expenseOwnerTreasuryWithdrawTokens?.items ?? []
  const tokenSupportAddeds = expenseResult?.expenseTokenSupportAddeds?.items ?? []
  const tokenSupportRemoveds = expenseResult?.expenseTokenSupportRemoveds?.items ?? []
  const tokenAddressChangeds = expenseResult?.expenseTokenAddressChangeds?.items ?? []
  const incomingTokenTransfers = incomingTokenTransfersResult?.bankTokenTransfers?.items ?? []

  const sections: RawExpenseTransaction[][] = [
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
    mapIncomingTransfersToTokenDeposits(incomingTokenTransfers),
    transfers.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.withdrawer,
      to: row.to,
      amount: row.amount,
      tokenAddress: zeroAddress,
      type: 'transfer'
    })),
    tokenTransfers.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.withdrawer,
      to: row.to,
      amount: row.amount,
      tokenAddress: row.token,
      type: 'tokenTransfer'
    })),
    approvals.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.contractAddress,
      to: row.signatureHash,
      amount: '0',
      tokenAddress: zeroAddress,
      type: row.activated ? 'approvalActivated' : 'approvalDeactivated'
    })),
    ownerTreasuryWithdrawNatives.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.contractAddress,
      to: row.ownerAddress,
      amount: row.amount,
      tokenAddress: zeroAddress,
      type: 'ownerTreasuryWithdrawNative'
    })),
    ownerTreasuryWithdrawTokens.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.contractAddress,
      to: row.ownerAddress,
      amount: row.amount,
      tokenAddress: row.token,
      type: 'ownerTreasuryWithdrawToken'
    })),
    tokenSupportAddeds.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.contractAddress,
      to: row.tokenAddress,
      amount: '0',
      tokenAddress: row.tokenAddress,
      type: 'tokenSupportAdded'
    })),
    tokenSupportRemoveds.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.contractAddress,
      to: row.tokenAddress,
      amount: '0',
      tokenAddress: row.tokenAddress,
      type: 'tokenSupportRemoved'
    })),
    tokenAddressChangeds.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.oldAddress,
      to: row.newAddress,
      amount: '0',
      tokenAddress: row.newAddress,
      type: 'tokenAddressChanged'
    }))
  ]

  return buildRawTransactions(sections)
}

export const formatExpenseTransactionDate = (timestamp: number): string =>
  new Date(timestamp * 1000).toLocaleString('en-US')

export const getExpenseTransactionTypeColor = (type: string): UBadgeColor => {
  const normalizedType = type.toLowerCase()

  if (normalizedType.includes('deposit')) return 'success'
  if (normalizedType.includes('transfer') || normalizedType.includes('withdraw')) return 'info'
  if (normalizedType.includes('approval')) return 'warning'
  if (normalizedType.includes('support') || normalizedType.includes('addresschanged'))
    return 'primary'
  return 'neutral'
}
