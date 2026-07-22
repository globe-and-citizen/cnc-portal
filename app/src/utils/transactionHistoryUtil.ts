import type { GroupedTransactionRow } from '@/types/transaction-history'
import { useTeamStore, useCurrencyStore } from '@/stores'
import { getTokenIcon, resolveTokenIdByAddress, tokenSymbol } from '@/utils/constantUtil'
import { NETWORK } from '@/constant'
import { zeroAddress } from 'viem'
import { getTransactionTypeLabel } from '@/utils/transactionTypeRegistry'
export { formatDecodedValue } from '@/utils/abiDecodeUtil'
export * from '@/utils/transactionTypeRegistry'

export const parseBigIntOrZero = (value: string): bigint => {
  try {
    return BigInt(value)
  } catch {
    return 0n
  }
}

export const resolveUser = (address: string) => {
  const teamStore = useTeamStore()
  const currencyStore = useCurrencyStore()
  const lower = address?.toLowerCase() ?? ''

  const contract = teamStore.currentTeamMeta.data?.teamContracts?.find(
    (c: { address: string }) => c.address.toLowerCase() === lower
  )
  if (contract) return { name: contract.type, address, icon: 'heroicons:document-text' }

  const member = teamStore.currentTeamMeta.data?.members.find(
    (m: { address: string }) => m.address.toLowerCase() === lower
  )
  if (member) return member

  const token = currencyStore.supportedTokens.find((t) => t.address.toLowerCase() === lower)
  if (token) {
    return {
      name: token.symbol,
      address,
      imageUrl: getTokenIcon(token.id)
    }
  }

  return { name: 'User', address }
}

export const getTransactionSummary = (
  tx: { type: string; amount: string | number; token: string },
  opts?: { fromName?: string; toName?: string }
): string => {
  const hasValue = Number(tx.amount) > 0 && tx.token !== '-'
  const amt = hasValue ? `${tx.amount} ${tx.token}` : ''
  const from = opts?.fromName
  const to = opts?.toName

  switch (tx.type) {
    case 'deposit':
      return from ? `From ${from}` : amt ? `Deposited ${amt}` : 'Deposit'
    case 'tokenDeposit':
      return from ? `From ${from}` : amt ? `Token deposit · ${amt}` : 'Token deposit'
    case 'transfer':
      return to ? `Native — to ${to}` : amt ? `Transfer · ${amt}` : 'Transfer'
    case 'tokenTransfer':
      return to ? `${tx.token} — to ${to}` : amt ? `Token transfer · ${amt}` : 'Token transfer'
    case 'withdraw':
      return to ? `Withdrawal to ${to}` : amt ? `Withdrawal · ${amt}` : 'Withdrawal'
    case 'withdrawToken':
      return to
        ? `Token withdrawal to ${to}`
        : amt
          ? `Token withdrawal · ${amt}`
          : 'Token withdrawal'
    case 'ownerTreasuryWithdrawNative':
      return to
        ? `Treasury withdrawal to ${to}`
        : amt
          ? `Treasury withdrawal · ${amt}`
          : 'Treasury withdrawal'
    case 'ownerTreasuryWithdrawToken':
      return to
        ? `Treasury token withdrawal to ${to}`
        : amt
          ? `Treasury token withdrawal · ${amt}`
          : 'Treasury token withdrawal'
    case 'feePaid':
      return to ? `Fee to ${to}` : amt ? `Fee · ${amt}` : 'Fee paid'
    case 'mint':
      return amt ? `Minted ${amt}` : 'Shares minted'
    case 'safeDeposit':
      return amt ? `Safe deposit · ${amt}` : 'Safe deposit'
    case 'dividendDistribution':
      return amt ? `Dividend triggered · ${amt}` : 'Dividend triggered'
    case 'dividendDistributed':
      return amt ? `Distributed ${amt}` : 'Dividend distributed'
    case 'dividendPaid':
      return amt ? `Paid ${amt}` : 'Dividend paid'
    case 'dividendPaymentFailed':
      return amt ? `Payment failed · ${amt}` : 'Payment failed'
    case 'rawTokenIn':
      return from ? `From ${from}` : amt ? `Received ${amt}` : 'Token received'
    case 'rawTokenOut':
      return to ? `Sent to ${to}` : amt ? `Sent ${amt}` : 'Token sent'
    case 'rawTokenInternal':
      return amt ? `Internal · ${amt}` : 'Internal transfer'
    case 'approvalActivated':
      return 'Approval activated'
    case 'approvalDeactivated':
      return 'Approval deactivated'
    case 'wageClaimEnabled':
      return 'Wage claim enabled'
    case 'wageClaimDisabled':
      return 'Wage claim disabled'
    case 'tokenSupportAdded':
      return 'Token support added'
    case 'tokenSupportRemoved':
      return 'Token support removed'
    case 'ownershipTransferred':
      return 'Ownership transferred'
    case 'tokenAddressChanged':
      return 'Token address updated'
    case 'safeDepositsEnabled':
      return 'Safe deposits enabled'
    case 'safeDepositsDisabled':
      return 'Safe deposits disabled'
    case 'safeAddressUpdated':
      return 'Safe address updated'
    case 'safeMultiplierUpdated':
      return tx.amount ? `Multiplier → ${tx.amount}${tx.token}` : 'Multiplier updated'
    case 'officerAddressUpdated':
      return 'Officer address updated'
    case 'lendingOfferCreated':
      return amt ? `Round opened · target ${amt}` : 'Round opened'
    case 'fundsLent':
      return from ? `Lent by ${from}` : amt ? `Lent ${amt}` : 'Funds lent'
    case 'lenderRepaid':
      return to ? `Repaid to ${to}` : amt ? `Repaid ${amt}` : 'Lender repaid'
    case 'lendingOfferFunded':
      return 'Round fully funded'
    case 'lendingOfferRefundable':
      return 'Round marked refundable'
    case 'partialFundingAccepted':
      return amt ? `Partial funding accepted · ${amt}` : 'Partial funding accepted'
    case 'principalRefunded':
      return to ? `Refunded to ${to}` : amt ? `Refunded ${amt}` : 'Principal refunded'
    case 'refundsDistributed':
      return amt ? `Refunds distributed · ${amt}` : 'Refunds distributed'
    case 'repaymentDistributed':
      return amt ? `Repayment distributed · ${amt}` : 'Repayment distributed'
    default:
      return ''
  }
}

// Bank's initialize() emits OwnershipTransferred(0x0 -> owner) together with
// TokenSupportAdded for each initially-supported token in the same tx. Grouping
// puts those under this row's subRows — surface the count alongside the arrow.
export const getInitialTokenSupportSummary = (row: {
  type: string
  from: string
  subRows?: ReadonlyArray<{ type: string }>
}): string => {
  if (row.type !== 'ownershipTransferred' || row.from?.toLowerCase() !== zeroAddress) return ''

  const tokenCount = (row.subRows ?? []).filter((sub) => sub.type === 'tokenSupportAdded').length
  if (tokenCount === 0) return ''

  return `${tokenCount} token${tokenCount === 1 ? '' : 's'} supported`
}

const toGroupedLeafRow = <T extends { txHash: string }>(row: T): GroupedTransactionRow<T> => ({
  ...row,
  groupedEventCount: 1,
  subRows: []
})

export const groupTransactionsByTxHash = <T extends { txHash: string }>(
  rows: ReadonlyArray<T>
): GroupedTransactionRow<T>[] => {
  const groupedByTxHash = new Map<string, T[]>()

  rows.forEach((row) => {
    const grouped = groupedByTxHash.get(row.txHash) ?? []
    grouped.push(row)
    groupedByTxHash.set(row.txHash, grouped)
  })

  const seen = new Set<string>()
  const groupedRows: GroupedTransactionRow<T>[] = []

  rows.forEach((row) => {
    if (seen.has(row.txHash)) return

    seen.add(row.txHash)
    const groupedEvents = groupedByTxHash.get(row.txHash) ?? [row]
    const [parentEvent, ...childEvents] = groupedEvents
    if (!parentEvent) return

    groupedRows.push({
      ...parentEvent,
      groupedEventCount: groupedEvents.length,
      subRows: childEvents.map(toGroupedLeafRow)
    })
  })

  return groupedRows
}

export const enrichTransaction = (tx: {
  amount: string | number
  tokenAddress?: string
  token: string
}) => {
  const currencyStore = useCurrencyStore()
  const tokenAddress = String(tx.tokenAddress ?? '').toLowerCase()
  const matchedToken = currencyStore.supportedTokens.find(
    (t) => t.address.toLowerCase() === tokenAddress
  )
  const token =
    matchedToken?.symbol || tokenSymbol(tokenAddress) || tx.token || NETWORK.currencySymbol
  const tokenId = matchedToken?.id ?? resolveTokenIdByAddress(tokenAddress)
  const amount = tx.amount ?? 0
  const numericAmount = Number(amount)
  const priceInLocal = tokenId ? currencyStore.getTokenPrice(tokenId, true) : 0
  const amountLocal = Number.isFinite(numericAmount) ? numericAmount * priceInLocal : 0
  return { tokenAddress, token, amount, amountLocal }
}

export const getUniqueSummary = (row: {
  type: string
  amount: string | number
  token: string
}): string | null => {
  const summary = getTransactionSummary(row)
  return summary && summary !== getTransactionTypeLabel(row.type) ? summary : null
}
