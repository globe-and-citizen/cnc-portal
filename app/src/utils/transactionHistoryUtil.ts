import type { GroupedTransactionRow } from '@/types/transaction-history'
import { useTeamStore, useCurrencyStore } from '@/stores'
import { getTokenIcon, resolveTokenIdByAddress, tokenSymbol } from '@/utils/constantUtil'
import { NETWORK } from '@/constant'
import { zeroAddress } from 'viem'
export { formatDecodedValue } from '@/utils/abiDecodeUtil'

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

import type { UBadgeColor } from '@/types/ui'

const TYPE_COLORS: Record<string, UBadgeColor> = {
  deposit: 'success',
  tokenDeposit: 'success',
  mint: 'success',
  safeDeposit: 'success',
  dividendPaid: 'success',
  transfer: 'info',
  tokenTransfer: 'info',
  rawTokenIn: 'info',
  rawTokenOut: 'info',
  rawTokenInternal: 'info',
  wageClaimEnabled: 'info',
  wageClaimDisabled: 'info',
  officerAddressUpdated: 'info',
  withdraw: 'warning',
  withdrawToken: 'warning',
  ownerTreasuryWithdrawNative: 'warning',
  ownerTreasuryWithdrawToken: 'warning',
  dividendDistribution: 'warning',
  dividendDistributed: 'warning',
  approvalActivated: 'warning',
  approvalDeactivated: 'warning',
  feePaid: 'error',
  dividendPaymentFailed: 'error',
  tokenSupportAdded: 'primary',
  tokenSupportRemoved: 'primary',
  tokenAddressChanged: 'primary',
  safeDepositsEnabled: 'primary',
  safeDepositsDisabled: 'primary',
  safeAddressUpdated: 'primary',
  safeMultiplierUpdated: 'primary',
  ownershipTransferred: 'primary'
}

export const getTransactionTypeColor = (type: string): UBadgeColor => TYPE_COLORS[type] ?? 'neutral'

const TYPE_LABELS: Record<string, string> = {
  deposit: 'Deposit',
  tokenDeposit: 'Token deposit',
  transfer: 'Transfer',
  tokenTransfer: 'Token transfer',
  withdraw: 'Withdrawal',
  withdrawToken: 'Token withdrawal',
  ownerTreasuryWithdrawNative: 'Treasury withdrawal',
  ownerTreasuryWithdrawToken: 'Treasury token withdrawal',
  feePaid: 'Fee paid',
  mint: 'Shares minted',
  safeDeposit: 'Safe deposit',
  dividendDistribution: 'Dividend distribution',
  dividendDistributed: 'Dividend distributed',
  dividendPaid: 'Dividend paid',
  dividendPaymentFailed: 'Payment failed',
  rawTokenIn: 'Token received',
  rawTokenOut: 'Token sent',
  rawTokenInternal: 'Internal transfer',
  approvalActivated: 'Approval activated',
  approvalDeactivated: 'Approval deactivated',
  wageClaimEnabled: 'Wage claim enabled',
  wageClaimDisabled: 'Wage claim disabled',
  tokenSupportAdded: 'Token support added',
  tokenSupportRemoved: 'Token support removed',
  tokenAddressChanged: 'Token address updated',
  safeDepositsEnabled: 'Safe deposits enabled',
  safeDepositsDisabled: 'Safe deposits disabled',
  safeAddressUpdated: 'Safe address updated',
  safeMultiplierUpdated: 'Multiplier updated',
  officerAddressUpdated: 'Officer address updated',
  ownershipTransferred: 'Ownership transferred'
}

export const DIVIDEND_TYPES = new Set([
  'dividendDistribution',
  'dividendDistributed',
  'dividendPaid',
  'dividendPaymentFailed'
])

export const formatTxHash = (hash: string): string =>
  hash.length >= 10 ? `${hash.slice(0, 6)}…${hash.slice(-4)}` : hash

export const getTransactionTypeLabel = (type: string): string =>
  TYPE_LABELS[type] ??
  type.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase())

const toGroupedLeafRow = <T extends { txHash: string }>(row: T): GroupedTransactionRow<T> => ({
  ...row,
  groupedEventCount: 1,
  subRows: []
})

const COUNTERPARTY_FROM = new Set(['deposit', 'tokenDeposit', 'rawTokenIn', 'safeDeposit'])

const COUNTERPARTY_TO = new Set([
  'transfer',
  'tokenTransfer',
  'withdraw',
  'withdrawToken',
  'ownerTreasuryWithdrawNative',
  'ownerTreasuryWithdrawToken',
  'feePaid',
  'rawTokenOut',
  'dividendPaid',
  'ownershipTransferred'
  // wageClaimEnabled/wageClaimDisabled excluded: their `to` is a bytes32 signature hash, not an address
])

const COUNTERPARTY_SHAREHOLDERS = new Set([
  'dividendDistribution',
  'dividendDistributed',
  'dividendPaymentFailed',
  'mint'
])

export const getTransactionCounterparty = (tx: {
  type: string
  from: string
  to: string
}): { label: string; address: string | null } => {
  if (COUNTERPARTY_FROM.has(tx.type)) return { label: 'From', address: tx.from }
  if (COUNTERPARTY_TO.has(tx.type)) return { label: 'To', address: tx.to }
  if (COUNTERPARTY_SHAREHOLDERS.has(tx.type)) return { label: 'Shareholders', address: null }
  return { label: '—', address: null }
}

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
