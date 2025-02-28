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

export interface BankTransaction extends BaseTransaction {
  amount?: string | number
  token?: string
}
