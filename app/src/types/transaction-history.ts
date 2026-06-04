export type GroupedTransactionRow<T extends { txHash: string }> = T & {
  groupedEventCount: number
  subRows: GroupedTransactionRow<T>[]
}

export type TransactionHistoryItemRow = {
  txHash: string
  date: string | number
  from: string
  to: string
  amount: string | number
  amountUSD: number
  tokenAddress: string
  token: string
  type: string
  amountLocal?: number
}

export type ExpenseTransactionRow = GroupedTransactionRow<TransactionHistoryItemRow>
