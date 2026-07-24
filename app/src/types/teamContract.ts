import type { Address } from 'viem'
export type ContractType =
  | 'Bank'
  | 'InvestorV1'
  | 'Investor'
  | 'Voting'
  | 'BoardOfDirectors'
  | 'ExpenseAccountEIP712'
  | 'CashRemunerationEIP712'
  | 'Campaign'
  | 'Elections'
  | 'Proposals'
  | 'Vesting'
  | 'SafeDepositRouter'
  | 'Safe'
  | 'FixedReturn'
export interface TeamContract {
  address: Address
  type: ContractType
  deployer: Address
  admins: string[]
  imageUrl?: string
}
