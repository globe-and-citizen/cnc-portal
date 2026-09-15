import { toValue, type MaybeRefOrGetter } from 'vue'
import type { Address } from 'viem'

/**
 * Query-key factory for FixedReturn's three `useQuery`-based on-chain read hooks
 * (`useFixedReturnAllOffers`, `useFixedReturnOfferLenders`, `useFixedReturnMyLenderPositions`
 * — see `reads.ts`). These aren't `useReadContract`-wrapped, so they fall outside
 * `useContractWritesV3`'s automatic per-contract-address invalidation and need their
 * own keys, previously duplicated as raw string-literal arrays across this file and
 * every view/modal that reads or invalidates them.
 *
 * `all` is a shared prefix so `invalidateQueries({ queryKey: fixedReturnKeys.all })`
 * matches every leaf below it in one call — see `invalidate.ts`.
 */
export const fixedReturnKeys = {
  all: ['fixedReturn'] as const,

  // Each branch splits a coarse "any query in this scope" prefix from the specific
  // leaf `useQuery` calls in reads.ts use — a caller that wants to invalidate/refetch
  // regardless of address/lender/offerIds (e.g. a retry button with no address handy)
  // uses the *All() prefix; reads.ts always uses the full leaf.
  allOffersAll: () => [...fixedReturnKeys.all, 'allOffers'] as const,
  allOffers: (address?: MaybeRefOrGetter<Address | undefined>) =>
    [...fixedReturnKeys.allOffersAll(), { address: toValue(address) ?? null }] as const,

  offerLendersAll: () => [...fixedReturnKeys.all, 'offerLenders'] as const,
  offerLenders: (
    address?: MaybeRefOrGetter<Address | undefined>,
    offerId?: MaybeRefOrGetter<string | number | undefined>,
    token?: MaybeRefOrGetter<Address | undefined>
  ) =>
    [
      ...fixedReturnKeys.offerLendersAll(),
      {
        address: toValue(address) ?? null,
        offerId: toValue(offerId) ?? null,
        token: toValue(token) ?? null
      }
    ] as const,

  myLenderPositionsAll: () => [...fixedReturnKeys.all, 'myLenderPositions'] as const,
  myLenderPositions: (
    address?: MaybeRefOrGetter<Address | undefined>,
    lender?: MaybeRefOrGetter<Address | undefined>,
    offerIds?: MaybeRefOrGetter<readonly number[] | undefined>
  ) =>
    [
      ...fixedReturnKeys.myLenderPositionsAll(),
      {
        address: toValue(address) ?? null,
        lender: toValue(lender) ?? null,
        offerIds: toValue(offerIds) ?? []
      }
    ] as const
} as const
