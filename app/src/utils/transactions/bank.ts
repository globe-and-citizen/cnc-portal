import type {
  BankEventFeed,
  RawBankTransaction,
  RawContractTokenTransferRow
} from '@/types/contract-events/bank'
import type { UBadgeColor } from '@/types/ui'
import { zeroAddress } from 'viem'
import { formatDateTime, fromUnix } from '@/utils/format'
import { buildRawTransactions, extractTxHashFromId } from './raw'

/**
 * Raw ERC-20 transfers no Bank event accounts for. A raw Transfer riding along a
 * Bank event (a token deposit/transfer, a dividend, or a token fee) is the same
 * on-chain movement, keyed by tx + token so the raw copy is dropped. What remains
 * moved without a Bank event: a credit funding sweep, or a plain transfer into a
 * Bank that has no deposit function of its own.
 */
export const unaccountedRawTokenTransfers = (
  bankResult?: BankEventFeed | null
): RawContractTokenTransferRow[] => {
  const accountedKey = (id: string, tokenAddress: string) =>
    `${extractTxHashFromId(id)}::${tokenAddress.toLowerCase()}`
  const accountedTokenMoves = new Set<string>([
    ...(bankResult?.bankTokenDeposits?.items ?? []).map((row) => accountedKey(row.id, row.token)),
    ...(bankResult?.bankTokenTransfers?.items ?? []).map((row) => accountedKey(row.id, row.token)),
    ...(bankResult?.bankDividendDistributionTriggereds?.items ?? []).map((row) =>
      accountedKey(row.id, row.token)
    ),
    ...(bankResult?.bankFeePaids?.items ?? [])
      .filter((row) => row.token)
      .map((row) => accountedKey(row.id, row.token as string))
  ])
  return (bankResult?.rawContractTokenTransfers?.items ?? []).filter(
    (row) => !accountedTokenMoves.has(accountedKey(row.id, row.tokenAddress))
  )
}

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
  const unaccountedRawTransfers = unaccountedRawTokenTransfers(bankResult)

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
