import type { RevertMessageResolver } from './errorCatalogs.types'

export const FIXED_RETURN_ERRORS: Record<string, string | RevertMessageResolver> = {
  InvalidDeadline: 'The subscription deadline must be on or before the loan start date',
  InvalidTermDuration: 'The loan term is outside the supported range',
  LenderCapExceedsFundingTarget: 'The per-lender cap exceeds the funding target',
  AllocationSumExceedsFundingTarget: 'Whitelist allocations exceed the funding target',
  WhitelistLengthMismatch: 'Whitelist addresses and allocations do not match',
  OfferNotOpen: 'This offering is closed or its subscription deadline has passed',
  OfferNotFunded: 'This offering has not been fully funded',
  OfferNotRefundable: 'This offering is not available for refunds',
  DeadlineNotPassed: 'The subscription deadline has not passed yet',
  NotWhitelisted: 'Your wallet is not whitelisted for this offering',
  DepositExceedsAllocation: 'This amount exceeds your remaining allocation',
  DepositExceedsLenderCap: 'This amount exceeds your remaining lender cap',
  FundingTargetReached: 'This amount exceeds the funding still available',
  NothingToRefund: 'There are no deposited funds to refund',
  ExceedsRepaymentObligation:
    'Repayment amount exceeds the total lender obligation (principal + interest)',
  TokenNotSupportedByBank: 'This token is not supported by the team treasury'
}
