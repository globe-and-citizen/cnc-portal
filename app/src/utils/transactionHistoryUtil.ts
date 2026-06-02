import type { GroupedTransactionRow } from '@/types/transaction-history'
import { useTeamStore, useCurrencyStore } from '@/stores'
import { getTokenIcon, resolveTokenIdByAddress, tokenSymbol } from '@/utils/constantUtil'
import { NETWORK } from '@/constant'
import { BANK_ABI } from '@/artifacts/abi/bank'
import { INVESTOR_ABI } from '@/artifacts/abi/investors'
import { EXPENSE_ACCOUNT_EIP712_ABI } from '@/artifacts/abi/expense-account-eip712'
import { CASH_REMUNERATION_EIP712_ABI } from '@/artifacts/abi/cash-remuneration-eip712'
import { SAFE_DEPOSIT_ROUTER_ABI } from '@/artifacts/abi/safe-deposit-router'
import { ELECTIONS_ABI } from '@/artifacts/abi/elections'
import { PROPOSALS_ABI } from '@/artifacts/abi/proposals'
import type { Abi } from 'viem'

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
  safeMultiplierUpdated: 'primary'
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
  officerAddressUpdated: 'Officer address updated'
}

export interface DecodedParam {
  name: string
  type: string
  display: string
  isAddress: boolean
}

export interface DecodedInputData {
  functionName: string
  params: DecodedParam[]
}

export const CONTRACT_ABI_MAP: Record<string, Abi> = {
  Bank: BANK_ABI,
  InvestorV1: INVESTOR_ABI,
  ExpenseAccountEIP712: EXPENSE_ACCOUNT_EIP712_ABI,
  CashRemunerationEIP712: CASH_REMUNERATION_EIP712_ABI,
  SafeDepositRouter: SAFE_DEPOSIT_ROUTER_ABI,
  Elections: ELECTIONS_ABI,
  Proposals: PROPOSALS_ABI
}

export const formatDecodedValue = (
  type: string,
  value: unknown
): { display: string; isAddress: boolean } => {
  if (value === null || value === undefined) return { display: '-', isAddress: false }
  if (type === 'address') return { display: String(value), isAddress: true }
  if (typeof value === 'bigint') return { display: value.toLocaleString(), isAddress: false }
  if (Array.isArray(value)) {
    const innerType = type.replace(/\[\d*\]$/, '')
    const items = value.map((v) => formatDecodedValue(innerType, v).display)
    return { display: `[${items.join(', ')}]`, isAddress: false }
  }
  if (typeof value === 'object') {
    try {
      const filtered = Object.fromEntries(
        Object.entries(value as Record<string, unknown>).filter(([k]) => isNaN(Number(k)))
      )
      const serialized = JSON.stringify(filtered, (_k, v) =>
        typeof v === 'bigint' ? v.toLocaleString() : v
      )
      return { display: serialized ?? '-', isAddress: false }
    } catch {
      return { display: '-', isAddress: false }
    }
  }
  return { display: String(value), isAddress: false }
}

export const getTransactionTypeLabel = (type: string): string =>
  TYPE_LABELS[type] ??
  type.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase())

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
