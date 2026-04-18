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

export type InvestorEventsQuery = {
  investorMints: { items: InvestorMintRow[] }
  investorDividendDistributeds: { items: InvestorDividendDistributedRow[] }
  investorDividendPaids: { items: InvestorDividendPaidRow[] }
  investorDividendPaymentFaileds: { items: InvestorDividendPaymentFailedRow[] }
}

export type InvestorTransactionType =
  | 'mint'
  | 'dividendDistributed'
  | 'dividendPaid'
  | 'dividendPaymentFailed'

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
