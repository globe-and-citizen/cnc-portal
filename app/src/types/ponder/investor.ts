export type InvestorMintRow = {
  id: string
  contractAddress: string
  shareholder: string
  amount: string
  timestamp: number
}

export type InvestorDividendDistributedRow = {
  id: string
  contractAddress: string
  distributor: string
  token: string
  totalAmount: string
  shareholderCount: string
  timestamp: number
}

export type InvestorDividendPaidRow = {
  id: string
  contractAddress: string
  shareholder: string
  token: string
  amount: string
  timestamp: number
}

export type InvestorDividendPaymentFailedRow = {
  id: string
  contractAddress: string
  shareholder: string
  token: string
  amount: string
  reason: string
  timestamp: number
}

export type SafeDepositRow = {
  id: string
  contractAddress: string
  depositor: string
  token: string
  tokenAmount: string
  sherAmount: string
  timestamp: number
}

export type SafeDepositsEnabledRow = {
  id: string
  contractAddress: string
  enabledBy: string
  timestamp: number
}

export type SafeDepositsDisabledRow = {
  id: string
  contractAddress: string
  disabledBy: string
  timestamp: number
}

export type SafeAddressUpdatedRow = {
  id: string
  contractAddress: string
  oldSafe: string
  newSafe: string
  timestamp: number
}

export type SafeMultiplierUpdatedRow = {
  id: string
  contractAddress: string
  oldMultiplier: string
  newMultiplier: string
  timestamp: number
}

export type InvestorEventsQuery = {
  investorMints: { items: InvestorMintRow[] }
  investorDividendDistributeds: { items: InvestorDividendDistributedRow[] }
  investorDividendPaids: { items: InvestorDividendPaidRow[] }
  investorDividendPaymentFaileds: { items: InvestorDividendPaymentFailedRow[] }
}

export type SafeDepositRouterEventsQuery = {
  safeDeposits: { items: SafeDepositRow[] }
  safeDepositsEnableds: { items: SafeDepositsEnabledRow[] }
  safeDepositsDisableds: { items: SafeDepositsDisabledRow[] }
  safeAddressUpdateds: { items: SafeAddressUpdatedRow[] }
  safeMultiplierUpdateds: { items: SafeMultiplierUpdatedRow[] }
}

export type InvestorTransactionType =
  | 'mint'
  | 'dividendDistributed'
  | 'dividendPaid'
  | 'dividendPaymentFailed'
  | 'safeDeposit'
  | 'safeDepositsEnabled'
  | 'safeDepositsDisabled'
  | 'safeAddressUpdated'
  | 'safeMultiplierUpdated'

export type RawInvestorTransaction = {
  txHash: string
  timestamp: number
  from: string
  to: string
  amount: string
  tokenAddress: string
  transactionType: InvestorTransactionType
  reason?: string
}
