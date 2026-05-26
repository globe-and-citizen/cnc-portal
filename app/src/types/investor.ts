export type StakeMode = 'add' | 'ending'

export type StakePayload = {
  amount: number
  percentage: number
  stakeMode: StakeMode
  addMax: number
  endingMin: number
  totalSupply: number
}

export type MintRecapData = {
  showRecap: boolean
  symbol: string
  issuedAmount: number
  recipientBalanceBefore: number
  recipientBalanceAfter: number
  totalSupplyBefore: number
  totalSupplyAfter: number
}
