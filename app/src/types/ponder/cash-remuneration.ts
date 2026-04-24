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

export type CashRemunerationEventsQuery = {
  cashRemunerationDeposits: { items: CashRemunerationDepositRow[] }
  cashRemunerationWithdraws: { items: CashRemunerationWithdrawRow[] }
  cashRemunerationWithdrawTokens: { items: CashRemunerationWithdrawTokenRow[] }
  cashRemunerationOwnerTreasuryWithdrawNatives: {
    items: CashRemunerationOwnerTreasuryWithdrawNativeRow[]
  }
  cashRemunerationOwnerTreasuryWithdrawTokens: {
    items: CashRemunerationOwnerTreasuryWithdrawTokenRow[]
  }
  cashRemunerationTokenSupportAddeds: { items: CashRemunerationTokenSupportAddedRow[] }
}

export type RawCashRemerationTransaction = {
  txHash: string
  timestamp: number
  from: string
  to: string
  amount: string
  tokenAddress: string
  type:
    | 'deposit'
    | 'withdraw'
    | 'withdrawToken'
    | 'ownerTreasuryWithdrawNative'
    | 'ownerTreasuryWithdrawToken'
    | 'tokenSupportAdded'
}
