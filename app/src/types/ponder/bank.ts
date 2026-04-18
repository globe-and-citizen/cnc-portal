export type BankDepositRow = {
  id: string
  contractAddress: string
  depositor: string
  amount: string
  timestamp: number
}

export type BankTokenDepositRow = {
  id: string
  contractAddress: string
  depositor: string
  token: string
  amount: string
  timestamp: number
}

export type BankTransferRow = {
  id: string
  sender: string
  to: string
  amount: string
  timestamp: number
}

export type BankTokenTransferRow = {
  id: string
  sender: string
  to: string
  token: string
  amount: string
  timestamp: number
}

export type BankDividendDistributionRow = {
  id: string
  contractAddress: string
  investor: string
  token: string
  totalAmount: string
  timestamp: number
}

export type BankFeePaidRow = {
  id: string
  contractAddress: string
  feeCollector: string
  token: string | null
  amount: string
  timestamp: number
}

export type RawContractTokenTransferRow = {
  id: string
  tokenAddress: string
  contractAddress: string
  direction: string
  from: string
  to: string
  amount: string
  timestamp: number
}

export type RawBankTransaction = {
  txHash: string
  timestamp: number
  from: string
  to: string
  amount: string
  tokenAddress: string
  type: string
}

export type BankEventsQuery = {
  bankDeposits: { items: BankDepositRow[] }
  bankTokenDeposits: { items: BankTokenDepositRow[] }
  bankTransfers: { items: BankTransferRow[] }
  bankTokenTransfers: { items: BankTokenTransferRow[] }
  bankDividendDistributionTriggereds: { items: BankDividendDistributionRow[] }
  bankFeePaids: { items: BankFeePaidRow[] }
  rawContractTokenTransfers: { items: RawContractTokenTransferRow[] }
}
