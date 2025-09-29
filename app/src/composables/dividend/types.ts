export const DS_FUNCTION_NAMES = {
  // reads
  OWNER: 'owner',
  PAUSED: 'paused',
  INVESTOR: 'investor',
  INVESTOR_SET: 'investorSet',
  RELEASABLE: 'releasable',
  PENDING: 'pending',
  RELEASED: 'released',
  TOTAL_ALLOCATED: 'totalAllocated',
  TOTAL_RELEASED: 'totalReleased',

  // writes
  PAUSE: 'pause',
  UNPAUSE: 'unpause',
  CLAIM: 'claim',
  SET_INVESTOR: 'setInvestor',
  TRANSFER_OWNERSHIP: 'transferOwnership'
} as const

export type DividendSplitterFunctionName =
  (typeof DS_FUNCTION_NAMES)[keyof typeof DS_FUNCTION_NAMES]

export function isValidDividendSplitterFunction(fn: string): fn is DividendSplitterFunctionName {
  return Object.values(DS_FUNCTION_NAMES).includes(fn as DividendSplitterFunctionName)
}
