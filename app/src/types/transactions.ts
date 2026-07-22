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
  tokenAddress?: string
}

export interface CashRemunerationTransaction extends BaseTransaction {
  amount: string | number
  token: string
  tokenAddress?: string
}

export interface BankTransaction extends BaseTransaction {
  amount: string | number
  token: string
  tokenAddress?: string
}

export interface InvestorsTransaction extends BaseTransaction {
  from: string
  to: string
  amount: string
  token: string
  tokenAddress: string
  reason?: string
}

export interface CreditTransaction extends BaseTransaction {
  amount: string | number
  token: string
  tokenAddress?: string
  /** Absent for contract-level events not scoped to a single round. */
  offerId?: string
}
