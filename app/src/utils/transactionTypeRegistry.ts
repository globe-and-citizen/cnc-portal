import type { UBadgeColor } from '@/types/ui'

const TYPE_COLORS: Record<string, UBadgeColor> = {
  deposit: 'success',
  tokenDeposit: 'success',
  mint: 'success',
  safeDeposit: 'success',
  dividendPaid: 'success',
  fundsLent: 'success',
  lenderRepaid: 'success',
  transfer: 'info',
  tokenTransfer: 'info',
  rawTokenIn: 'info',
  rawTokenOut: 'info',
  rawTokenInternal: 'info',
  wageClaimEnabled: 'info',
  wageClaimDisabled: 'info',
  officerAddressUpdated: 'info',
  lendingOfferCreated: 'info',
  lendingOfferFunded: 'info',
  withdraw: 'warning',
  withdrawToken: 'warning',
  ownerTreasuryWithdrawNative: 'warning',
  ownerTreasuryWithdrawToken: 'warning',
  dividendDistribution: 'warning',
  dividendDistributed: 'warning',
  approvalActivated: 'warning',
  approvalDeactivated: 'warning',
  lendingOfferRefundable: 'warning',
  partialFundingAccepted: 'warning',
  principalRefunded: 'warning',
  refundsDistributed: 'warning',
  repaymentDistributed: 'warning',
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
  ownershipTransferred: 'Ownership transferred',
  lendingOfferCreated: 'Round opened',
  fundsLent: 'Funds lent',
  lenderRepaid: 'Lender repaid',
  lendingOfferFunded: 'Fully funded',
  lendingOfferRefundable: 'Marked refundable',
  partialFundingAccepted: 'Partial funding accepted',
  principalRefunded: 'Principal refunded',
  refundsDistributed: 'Refunds distributed',
  repaymentDistributed: 'Repayment distributed'
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

const COUNTERPARTY_FROM = new Set([
  'deposit',
  'tokenDeposit',
  'rawTokenIn',
  'safeDeposit',
  'fundsLent'
])

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
  'ownershipTransferred',
  'lenderRepaid',
  'principalRefunded'
  // wageClaimEnabled/wageClaimDisabled excluded: their `to` is a bytes32 signature hash, not an address
])

const COUNTERPARTY_SHAREHOLDERS = new Set([
  'dividendDistribution',
  'dividendDistributed',
  'dividendPaymentFailed',
  'mint'
])

const COUNTERPARTY_LENDERS = new Set(['refundsDistributed', 'repaymentDistributed'])

export const getTransactionCounterparty = (tx: {
  type: string
  from: string
  to: string
}): { label: string; address: string | null } => {
  if (COUNTERPARTY_FROM.has(tx.type)) return { label: 'From', address: tx.from }
  if (COUNTERPARTY_TO.has(tx.type)) return { label: 'To', address: tx.to }
  if (COUNTERPARTY_SHAREHOLDERS.has(tx.type)) return { label: 'Shareholders', address: null }
  if (COUNTERPARTY_LENDERS.has(tx.type)) return { label: 'Lenders', address: null }
  return { label: '—', address: null }
}
