import type { FixedReturnEventsQuery, RawFixedReturnTransaction } from '@/types/ponder/fixedReturn'
import { zeroAddress } from 'viem'
import { buildRawTransactions, extractTxHashFromId } from './rawTransactionsUtil'

export const buildRawFixedReturnTransactions = (
  fixedReturnResult?: FixedReturnEventsQuery | null
): RawFixedReturnTransaction[] => {
  const created = fixedReturnResult?.fixedReturnLendingOfferCreateds?.items ?? []
  const funded = fixedReturnResult?.fixedReturnLendingOfferFundeds?.items ?? []
  const refundable = fixedReturnResult?.fixedReturnLendingOfferRefundables?.items ?? []
  const partiallyFunded = fixedReturnResult?.fixedReturnPartialFundingAccepteds?.items ?? []
  const lent = fixedReturnResult?.fixedReturnFundsLents?.items ?? []
  const repaid = fixedReturnResult?.fixedReturnLenderRepaids?.items ?? []
  const principalRefunded = fixedReturnResult?.fixedReturnPrincipalRefundeds?.items ?? []
  const refundsDistributed = fixedReturnResult?.fixedReturnRefundsDistributeds?.items ?? []
  const repaymentDistributed = fixedReturnResult?.fixedReturnRepaymentDistributeds?.items ?? []
  const ownershipTransfers = fixedReturnResult?.fixedReturnOwnershipTransferreds?.items ?? []
  const tokenSupportAddeds = fixedReturnResult?.fixedReturnTokenSupportAddeds?.items ?? []
  const tokenSupportRemoveds = fixedReturnResult?.fixedReturnTokenSupportRemoveds?.items ?? []

  // Only LendingOfferCreated carries the offer's token address — every later
  // per-offer event only references the offerId — so resolve it through this map.
  const tokenByOfferId = new Map(created.map((row) => [row.offerId, row.token]))
  const tokenFor = (offerId: string) => tokenByOfferId.get(offerId) ?? zeroAddress

  const sections: RawFixedReturnTransaction[][] = [
    created.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      // `to` is the contract itself, not row.token: fundingTarget is only the
      // round's goal, not funds actually moving anywhere yet, so `from`/`to`
      // must not look like a real transfer to useTransactionInline's direction
      // heuristic (it would otherwise render this as a "-25,000 USDC" outflow).
      from: row.contractAddress,
      to: row.contractAddress,
      amount: row.fundingTarget,
      tokenAddress: row.token,
      type: 'lendingOfferCreated',
      offerId: row.offerId
    })),
    lent.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.lender,
      to: row.contractAddress,
      amount: row.amount,
      tokenAddress: tokenFor(row.offerId),
      type: 'fundsLent',
      offerId: row.offerId
    })),
    repaid.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.contractAddress,
      to: row.lender,
      amount: row.amount,
      tokenAddress: tokenFor(row.offerId),
      type: 'lenderRepaid',
      offerId: row.offerId
    })),
    funded.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.contractAddress,
      to: row.contractAddress,
      amount: '0',
      tokenAddress: tokenFor(row.offerId),
      type: 'lendingOfferFunded',
      offerId: row.offerId
    })),
    refundable.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.contractAddress,
      to: row.contractAddress,
      amount: '0',
      tokenAddress: tokenFor(row.offerId),
      type: 'lendingOfferRefundable',
      offerId: row.offerId
    })),
    partiallyFunded.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.contractAddress,
      to: row.contractAddress,
      amount: row.totalFunded,
      tokenAddress: tokenFor(row.offerId),
      type: 'partialFundingAccepted',
      offerId: row.offerId
    })),
    principalRefunded.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.contractAddress,
      to: row.lender,
      amount: row.amount,
      tokenAddress: tokenFor(row.offerId),
      type: 'principalRefunded',
      offerId: row.offerId
    })),
    refundsDistributed.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.contractAddress,
      to: row.contractAddress,
      amount: row.totalAmount,
      tokenAddress: tokenFor(row.offerId),
      type: 'refundsDistributed',
      offerId: row.offerId
    })),
    repaymentDistributed.map((row) => ({
      txHash: extractTxHashFromId(row.id),
      timestamp: row.timestamp,
      from: row.contractAddress,
      to: row.contractAddress,
      amount: row.totalAmount,
      tokenAddress: tokenFor(row.offerId),
      type: 'repaymentDistributed',
      offerId: row.offerId
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
    }))
  ]

  return buildRawTransactions(sections)
}

export const formatFixedReturnTransactionDate = (timestamp: number): string =>
  new Date(timestamp * 1000).toLocaleString('en-US')
