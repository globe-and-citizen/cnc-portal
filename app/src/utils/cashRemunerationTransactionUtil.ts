import type {
  CashRemunerationEventsQuery,
  RawCashRemunerationTransaction
} from '@/types/ponder/cash-remuneration'
import type { IncomingBankTokenTransfersQuery } from '@/types/ponder/bank'
import { zeroAddress } from 'viem'
import {
  buildRawTransactions,
  extractTxHashFromId,
  mapIncomingTransfersToTokenDeposits
} from './rawTransactionsUtil'

type UBadgeColor = 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'

export const buildRawCashRemunerationTransactions = (
  cashRemunerationResult?: CashRemunerationEventsQuery | null,
  incomingTokenTransfersResult?: IncomingBankTokenTransfersQuery | null
): RawCashRemunerationTransaction[] => {
  const deposits = cashRemunerationResult?.cashRemunerationDeposits?.items ?? []
  const withdraws = cashRemunerationResult?.cashRemunerationWithdraws?.items ?? []
  const withdrawTokens = cashRemunerationResult?.cashRemunerationWithdrawTokens?.items ?? []
  const wageClaims = cashRemunerationResult?.cashRemunerationWageClaims?.items ?? []
  const ownerTreasuryWithdrawNatives =
    cashRemunerationResult?.cashRemunerationOwnerTreasuryWithdrawNatives?.items ?? []
  const ownerTreasuryWithdrawTokens =
    cashRemunerationResult?.cashRemunerationOwnerTreasuryWithdrawTokens?.items ?? []
  const officerUpdateds = cashRemunerationResult?.cashRemunerationOfficerUpdateds?.items ?? []
  const tokenSupportAddeds = cashRemunerationResult?.cashRemunerationTokenSupportAddeds?.items ?? []
  const tokenSupportRemoveds =
    cashRemunerationResult?.cashRemunerationTokenSupportRemoveds?.items ?? []
  const incomingTokenTransfers = incomingTokenTransfersResult?.bankTokenTransfers?.items ?? []

  const sections: RawCashRemunerationTransaction[][] = [
    deposits.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.depositor,
      to: row.contractAddress,
      amount: row.amount,
      tokenAddress: zeroAddress,
      type: 'deposit'
    })),
    mapIncomingTransfersToTokenDeposits(incomingTokenTransfers),
    withdraws.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.contractAddress,
      to: row.withdrawer,
      amount: row.amount,
      tokenAddress: zeroAddress,
      type: 'withdraw'
    })),
    withdrawTokens.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.contractAddress,
      to: row.withdrawer,
      amount: row.amount,
      tokenAddress: row.tokenAddress,
      type: 'withdrawToken'
    })),
    wageClaims.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.contractAddress,
      to: row.signatureHash,
      amount: '0',
      tokenAddress: zeroAddress,
      type: row.enabled ? 'wageClaimEnabled' : 'wageClaimDisabled'
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
      tokenAddress: row.tokenAddress,
      type: 'ownerTreasuryWithdrawToken'
    })),
    officerUpdateds.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.contractAddress,
      to: row.newOfficerAddress,
      amount: '0',
      tokenAddress: zeroAddress,
      type: 'officerAddressUpdated'
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
    }))
  ]

  return buildRawTransactions(sections)
}

export const formatCashRemunerationTransactionDate = (timestamp: number): string =>
  new Date(timestamp * 1000).toLocaleString('en-US')

export const getCashRemunerationTransactionTypeColor = (type: string): UBadgeColor => {
  const normalizedType = type.toLowerCase()

  if (normalizedType.includes('deposit')) return 'success'
  if (normalizedType.includes('withdraw')) return 'warning'
  if (normalizedType.includes('wageclaim') || normalizedType.includes('officer')) return 'info'
  if (normalizedType.includes('token')) return 'primary'
  return 'neutral'
}
