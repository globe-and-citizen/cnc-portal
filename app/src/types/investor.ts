export type StakeMode = 'add' | 'ending'

export type MintStakeFormState = {
  address: string
  amount: string
  percentage: string
  stakeMode: StakeMode
}

export type MintRecapData = {
  showRecap: boolean
  symbol: string
  issuedAmount: number
  recipientStakeBefore: number
  recipientStakeAfter: number
  recipientStakeIssued: number
  recipientBalanceBefore: number
  recipientBalanceAfter: number
  totalSupplyBefore: number
  totalSupplyAfter: number
}
