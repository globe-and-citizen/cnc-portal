export type CashRemunerationDepositRow = {
  id: string
  contractAddress: string
  depositor: string
  amount: string
  timestamp: number
}

export type CashRemunerationWithdrawRow = {
  id: string
  contractAddress: string
  withdrawer: string
  amount: string
  timestamp: number
}

export type CashRemunerationWithdrawTokenRow = {
  id: string
  contractAddress: string
  withdrawer: string
  tokenAddress: string
  amount: string
  timestamp: number
}

export type CashRemunerationOwnerTreasuryWithdrawNativeRow = {
  id: string
  contractAddress: string
  ownerAddress: string
  amount: string
  timestamp: number
}

export type CashRemunerationOwnerTreasuryWithdrawTokenRow = {
  id: string
  contractAddress: string
  ownerAddress: string
  tokenAddress: string
  amount: string
  timestamp: number
}

export type CashRemunerationTokenSupportAddedRow = {
  id: string
  contractAddress: string
  tokenAddress: string
  timestamp: number
}

export type CashRemunerationTokenSupportRemovedRow = {
  id: string
  contractAddress: string
  tokenAddress: string
  timestamp: number
}

export type CashRemunerationWageClaimRow = {
  id: string
  contractAddress: string
  signatureHash: string
  enabled: boolean
  timestamp: number
}

export type CashRemunerationOfficerUpdatedRow = {
  id: string
  contractAddress: string
  newOfficerAddress: string
  timestamp: number
}

export type CashRemunerationEventsQuery = {
  cashRemunerationDeposits: { items: CashRemunerationDepositRow[] }
  cashRemunerationWithdraws: { items: CashRemunerationWithdrawRow[] }
  cashRemunerationWithdrawTokens: { items: CashRemunerationWithdrawTokenRow[] }
  cashRemunerationWageClaims: { items: CashRemunerationWageClaimRow[] }
  cashRemunerationOwnerTreasuryWithdrawNatives: {
    items: CashRemunerationOwnerTreasuryWithdrawNativeRow[]
  }
  cashRemunerationOwnerTreasuryWithdrawTokens: {
    items: CashRemunerationOwnerTreasuryWithdrawTokenRow[]
  }
  cashRemunerationOfficerUpdateds: { items: CashRemunerationOfficerUpdatedRow[] }
  cashRemunerationTokenSupportAddeds: { items: CashRemunerationTokenSupportAddedRow[] }
  cashRemunerationTokenSupportRemoveds: { items: CashRemunerationTokenSupportRemovedRow[] }
}

export type CashRemunerationTransactionType =
  | 'deposit'
  | 'tokenDeposit'
  | 'withdraw'
  | 'withdrawToken'
  | 'wageClaimEnabled'
  | 'wageClaimDisabled'
  | 'ownerTreasuryWithdrawNative'
  | 'ownerTreasuryWithdrawToken'
  | 'officerAddressUpdated'
  | 'tokenSupportAdded'
  | 'tokenSupportRemoved'

export type RawCashRemunerationTransaction = {
  txHash: string
  timestamp: number
  from: string
  to: string
  amount: string
  tokenAddress: string
  type: CashRemunerationTransactionType
}

export type RawCashRemerationTransaction = RawCashRemunerationTransaction
