export type FixedReturnLendingOfferCreatedRow = {
  id: string
  contractAddress: string
  offerId: string
  token: string
  fundingTarget: string
  timestamp: number
}

export type FixedReturnFundsLentRow = {
  id: string
  contractAddress: string
  offerId: string
  lender: string
  amount: string
  timestamp: number
}

export type FixedReturnLenderRepaidRow = {
  id: string
  contractAddress: string
  offerId: string
  lender: string
  amount: string
  timestamp: number
}

export type FixedReturnLendingOfferFundedRow = {
  id: string
  contractAddress: string
  offerId: string
  timestamp: number
}

export type FixedReturnLendingOfferRefundableRow = {
  id: string
  contractAddress: string
  offerId: string
  timestamp: number
}

export type FixedReturnPartialFundingAcceptedRow = {
  id: string
  contractAddress: string
  offerId: string
  totalFunded: string
  timestamp: number
}

export type FixedReturnPrincipalRefundedRow = {
  id: string
  contractAddress: string
  offerId: string
  lender: string
  amount: string
  timestamp: number
}

export type FixedReturnRefundsDistributedRow = {
  id: string
  contractAddress: string
  offerId: string
  totalAmount: string
  timestamp: number
}

export type FixedReturnRepaymentDistributedRow = {
  id: string
  contractAddress: string
  offerId: string
  totalAmount: string
  timestamp: number
}

export type FixedReturnOwnershipTransferredRow = {
  id: string
  contractAddress: string
  previousOwner: string
  newOwner: string
  timestamp: number
}

export type FixedReturnTokenSupportAddedRow = {
  id: string
  contractAddress: string
  tokenAddress: string
  timestamp: number
}

export type FixedReturnTokenSupportRemovedRow = {
  id: string
  contractAddress: string
  tokenAddress: string
  timestamp: number
}

export type FixedReturnEventsQuery = {
  fixedReturnLendingOfferCreateds: { items: FixedReturnLendingOfferCreatedRow[] }
  fixedReturnFundsLents: { items: FixedReturnFundsLentRow[] }
  fixedReturnLenderRepaids: { items: FixedReturnLenderRepaidRow[] }
  fixedReturnLendingOfferFundeds: { items: FixedReturnLendingOfferFundedRow[] }
  fixedReturnLendingOfferRefundables: { items: FixedReturnLendingOfferRefundableRow[] }
  fixedReturnPartialFundingAccepteds: { items: FixedReturnPartialFundingAcceptedRow[] }
  fixedReturnPrincipalRefundeds: { items: FixedReturnPrincipalRefundedRow[] }
  fixedReturnRefundsDistributeds: { items: FixedReturnRefundsDistributedRow[] }
  fixedReturnRepaymentDistributeds: { items: FixedReturnRepaymentDistributedRow[] }
  fixedReturnOwnershipTransferreds: { items: FixedReturnOwnershipTransferredRow[] }
  fixedReturnTokenSupportAddeds: { items: FixedReturnTokenSupportAddedRow[] }
  fixedReturnTokenSupportRemoveds: { items: FixedReturnTokenSupportRemovedRow[] }
}

export type RawFixedReturnTransaction = {
  txHash: string
  timestamp: number
  from: string
  to: string
  amount: string
  tokenAddress: string
  type: string
  /** Absent for contract-level events (ownership transfer, token support) that
   *  aren't scoped to a single round. */
  offerId?: string
}
