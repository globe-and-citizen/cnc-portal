import type { BankEventFeed, RawBankTransaction } from '@/types/contract-events/bank'
import type { UBadgeColor } from '@/types/ui'
import { zeroAddress } from 'viem'
import { formatDateTime, fromUnix } from '@/utils/format'
import { buildRawTransactions, extractTxHashFromId } from './raw'

export const buildRawBankTransactions = (
  bankResult?: BankEventFeed | null
): RawBankTransaction[] => {
  const deposits = bankResult?.bankDeposits?.items ?? []
  const tokenDeposits = bankResult?.bankTokenDeposits?.items ?? []
  const transfers = bankResult?.bankTransfers?.items ?? []
  const tokenTransfers = bankResult?.bankTokenTransfers?.items ?? []
  const dividends = bankResult?.bankDividendDistributionTriggereds?.items ?? []
  const fees = bankResult?.bankFeePaids?.items ?? []
  const ownershipTransfers = bankResult?.bankOwnershipTransferreds?.items ?? []
  const tokenSupportAddeds = bankResult?.bankTokenSupportAddeds?.items ?? []
  const tokenSupportRemoveds = bankResult?.bankTokenSupportRemoveds?.items ?? []
  const rawTokenTransfers = bankResult?.rawContractTokenTransfers?.items ?? []

  // A raw ERC-20 Transfer riding along a Bank event (a token deposit/transfer,
  // a dividend, or a token fee) is the same on-chain movement already listed
  // above — key those by tx + token so the raw copy can be dropped, leaving only
  // transfers the Bank never emitted an event for (e.g. a credit funding sweep).
  const accountedKey = (txHash: string, tokenAddress: string) =>
    `${txHash}::${tokenAddress.toLowerCase()}`
  const accountedTokenMoves = new Set<string>([
    ...tokenDeposits.map((row) => accountedKey(extractTxHashFromId(row.id), row.token)),
    ...tokenTransfers.map((row) => accountedKey(extractTxHashFromId(row.id), row.token)),
    ...dividends.map((row) => accountedKey(extractTxHashFromId(row.id), row.token)),
    ...fees
      .filter((row) => row.token)
      .map((row) => accountedKey(extractTxHashFromId(row.id), row.token as string))
  ])
  const unaccountedRawTransfers = rawTokenTransfers.filter(
    (row) => !accountedTokenMoves.has(accountedKey(extractTxHashFromId(row.id), row.tokenAddress))
  )

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
    ownershipTransfers.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.previousOwner,
      to: row.newOwner,
      amount: '0',
      tokenAddress: zeroAddress,
      type: 'ownershipTransferred'
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
    unaccountedRawTransfers.map((row) => ({
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
  formatDateTime(fromUnix(timestamp))

export const getBankTransactionTypeColor = (type: string): UBadgeColor => {
  const normalizedType = type.toLowerCase()

  if (normalizedType.includes('deposit')) return 'success'
  if (normalizedType.includes('transfer') || normalizedType.includes('raw')) return 'info'
  if (normalizedType.includes('dividend')) return 'warning'
  if (normalizedType.includes('fee')) return 'error'
  return 'neutral'
}
