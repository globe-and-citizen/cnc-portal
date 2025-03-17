export interface Transaction {
  hash: string
  date: string
  type: 'Deposit' | 'Transfer'
  from: string
  to: string
  amountUSD: number
  amountCAD: number
  receipt: string
}
