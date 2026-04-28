export type ExpenseDepositRow = {
  id: string
  contractAddress: string
  depositor: string
  amount: string
  timestamp: number
}

export type ExpenseTokenDepositRow = {
  id: string
  contractAddress: string
  depositor: string
  token: string
  amount: string
  timestamp: number
}

export type ExpenseTransferRow = {
  id: string
  contractAddress: string
  withdrawer: string
  to: string
  amount: string
  timestamp: number
}

export type ExpenseTokenTransferRow = {
  id: string
  contractAddress: string
  withdrawer: string
  to: string
  token: string
  amount: string
  timestamp: number
}

export type ExpenseApprovalRow = {
  id: string
  contractAddress: string
  signatureHash: string
  activated: boolean
  timestamp: number
}

export type ExpenseOwnerTreasuryWithdrawNativeRow = {
  id: string
  contractAddress: string
  ownerAddress: string
  amount: string
  timestamp: number
}

export type ExpenseOwnerTreasuryWithdrawTokenRow = {
  id: string
  contractAddress: string
  ownerAddress: string
  token: string
  amount: string
  timestamp: number
}

export type ExpenseTokenSupportAddedRow = {
  id: string
  contractAddress: string
  tokenAddress: string
  timestamp: number
}

export type ExpenseTokenSupportRemovedRow = {
  id: string
  contractAddress: string
  tokenAddress: string
  timestamp: number
}

export type ExpenseTokenAddressChangedRow = {
  id: string
  contractAddress: string
  addressWhoChanged: string
  tokenSymbol: string
  oldAddress: string
  newAddress: string
  timestamp: number
}

export type ExpenseEventsQuery = {
  expenseDeposits: { items: ExpenseDepositRow[] }
  expenseTokenDeposits: { items: ExpenseTokenDepositRow[] }
  expenseTransfers: { items: ExpenseTransferRow[] }
  expenseTokenTransfers: { items: ExpenseTokenTransferRow[] }
  expenseApprovals: { items: ExpenseApprovalRow[] }
  expenseOwnerTreasuryWithdrawNatives: { items: ExpenseOwnerTreasuryWithdrawNativeRow[] }
  expenseOwnerTreasuryWithdrawTokens: { items: ExpenseOwnerTreasuryWithdrawTokenRow[] }
  expenseTokenSupportAddeds: { items: ExpenseTokenSupportAddedRow[] }
  expenseTokenSupportRemoveds: { items: ExpenseTokenSupportRemovedRow[] }
  expenseTokenAddressChangeds: { items: ExpenseTokenAddressChangedRow[] }
}

export type ExpenseTransactionType =
  | 'deposit'
  | 'tokenDeposit'
  | 'transfer'
  | 'tokenTransfer'
  | 'approvalActivated'
  | 'approvalDeactivated'
  | 'ownerTreasuryWithdrawNative'
  | 'ownerTreasuryWithdrawToken'
  | 'tokenSupportAdded'
  | 'tokenSupportRemoved'
  | 'tokenAddressChanged'

export type RawExpenseTransaction = {
  txHash: string
  timestamp: number
  from: string
  to: string
  amount: string
  tokenAddress: string
  type: ExpenseTransactionType
}
