export type StakeMode = 'add' | 'ending'

export type MintStakeFormState = {
  address: string
  amount: string
  percentage: string
  stakeMode: StakeMode
}
