export interface BaseTransaction {
  txHash: string
  date: string | number
  type: string
  from: string
  to: string
  amountUSD: number
  receipt?: string
  [key: string]: string | number | undefined
}

export interface ExpenseTransaction extends BaseTransaction {
  amount: string | number
  token: string
}

export interface CashRemunerationTransaction extends BaseTransaction {
  amount: string | number
}

export interface BankTransaction extends BaseTransaction {
  amount?: string | number
  token?: string
}

export interface InvestorsTransaction extends BaseTransaction {
  from: string
  to: string
  amount: string
  token: string
}

export interface RawInvestorsTransaction {
  amount: number
  blockTimestamp: string
  from: string
  to: string
  tokenAddress: string
  transactionHash: string
  transactionType: string
}
