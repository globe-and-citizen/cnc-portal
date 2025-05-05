import type { Address } from 'viem'
type ContractType =
  | 'Bank'
  | 'InvestorsV1'
  | 'Voting'
  | 'BoardOfDirectors'
  | 'ExpenseAccount'
  | 'ExpenseAccountEIP712'
  | 'CashRemunerationEIP712'
  | 'Campaign'
export interface TeamContract {
  address: Address
  type: ContractType
  deployer: Address
  admins: string[]
}
