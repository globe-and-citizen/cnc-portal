import type { QueryClient } from '@tanstack/vue-query'
import type { Address } from 'viem'
import { contractReadsOfAddress } from '@/composables/contracts/useContractWritesV3'
import { fixedReturnKeys } from './reads'

/** Owned by useFixedReturnEventsViaLogs.ts, not this module — invalidated alongside
 *  the FixedReturn reads above since every mutation here also appends a new event. */
const EVENTS_LOG_KEY = ['fixed-return-events-logs'] as const

/**
 * Shared by every mutation below: FixedReturn's three `useQuery`-based read hooks
 * (`reads.ts`) aren't `useReadContract`-wrapped, so they fall outside
 * `useContractWritesV3`'s own per-contract-address auto-invalidation — plus the
 * sibling on-chain-events-log query every one of these views also depends on.
 */
function invalidateFixedReturnReads(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: fixedReturnKeys.all }),
    queryClient.invalidateQueries({ queryKey: EVENTS_LOG_KEY })
  ])
}

/**
 * After a successful lendFunds: refresh round/position reads, plus the lender's own
 * ERC20 allowance/balance for the round's token — lendFunds writes to FixedReturn,
 * not the token contract, so `useContractWritesV3`'s own auto-invalidation (keyed off
 * the *written* contract's address) never reaches the token's reads.
 */
export async function invalidateAfterLend(queryClient: QueryClient, tokenAddress: Address) {
  await Promise.all([
    invalidateFixedReturnReads(queryClient),
    queryClient.invalidateQueries({ predicate: contractReadsOfAddress(tokenAddress) })
  ])
}

/** After repayLenders (via Bank) settles: FixedReturn reads, plus the token's reads
 *  so the Bank treasury balance and any lender balance reflect the transfer. */
export async function invalidateAfterRepay(queryClient: QueryClient, tokenAddress: Address) {
  await Promise.all([
    invalidateFixedReturnReads(queryClient),
    queryClient.invalidateQueries({ predicate: contractReadsOfAddress(tokenAddress) })
  ])
}

/** After refundLenders returns principal to every lender: FixedReturn reads, plus
 *  the token's reads since the refund is itself a token transfer. */
export async function invalidateAfterRefund(queryClient: QueryClient, tokenAddress: Address) {
  await Promise.all([
    invalidateFixedReturnReads(queryClient),
    queryClient.invalidateQueries({ predicate: contractReadsOfAddress(tokenAddress) })
  ])
}

/** After acceptPartialFunding moves the raised principal to the company Bank:
 *  FixedReturn reads, plus the token's reads for the same reason as refund. */
export async function invalidateAfterAcceptPartialFunding(
  queryClient: QueryClient,
  tokenAddress: Address
) {
  await Promise.all([
    invalidateFixedReturnReads(queryClient),
    queryClient.invalidateQueries({ predicate: contractReadsOfAddress(tokenAddress) })
  ])
}
