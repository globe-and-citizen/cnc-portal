import type { FixedReturnOfferingResponse } from '@/types'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import { createMutationHook, createQueryHook, queryPresets } from './queryFactory'

/**
 * Query key factory for FixedReturn offering off-chain metadata
 */
export const fixedReturnOfferingKeys = {
  all: ['fixedReturnOfferings'] as const,
  lists: () => [...fixedReturnOfferingKeys.all, 'list'] as const,
  list: (teamId: string | number | null) =>
    [...fixedReturnOfferingKeys.lists(), { teamId }] as const
}

// ============================================================================
// GET /fixed-return-offering - Fetch offering title/purpose metadata for a team
// ============================================================================

export interface GetFixedReturnOfferingsParams {
  queryParams: {
    /** Team ID to filter offerings */
    teamId: MaybeRefOrGetter<string | number | null>
  }
}

/**
 * Fetch off-chain title/purpose metadata for a team's FixedReturn offerings.
 * FixedReturn.sol has no title/description params — the contract's NatSpec says the
 * calling application persists them linked by the on-chain offerId (see
 * backend/prisma/schema.prisma's FixedReturnOffering model).
 *
 * @endpoint GET /fixed-return-offering
 * @pathParams none
 * @queryParams { teamId: string }
 * @body none
 */
export const useGetFixedReturnOfferingsQuery = createQueryHook<
  FixedReturnOfferingResponse[],
  GetFixedReturnOfferingsParams
>({
  endpoint: 'fixed-return-offering',
  queryKey: (params) => fixedReturnOfferingKeys.list(toValue(params.queryParams.teamId)),
  enabled: (params) => !!toValue(params.queryParams.teamId),
  options: queryPresets.moderate
})

// ============================================================================
// POST /fixed-return-offering - Persist title/purpose for a new lending offer
// ============================================================================

export interface CreateFixedReturnOfferingParams {
  body: {
    /** Team the offering belongs to. */
    teamId: number
    /** On-chain offerId returned by createLendingOffer. */
    offerId: number
    title: string
    purpose?: string
  }
}

/**
 * Persist off-chain title/purpose for a FixedReturn lending offer after it has been
 * created on-chain. FixedReturn.sol has no title/description params, so the calling
 * application records them here keyed by (teamId, on-chain offerId) — see the GET
 * query above and backend/prisma/schema.prisma's FixedReturnOffering model.
 *
 * @endpoint POST /fixed-return-offering
 * @body { teamId, offerId, title, purpose? }
 */
export const useCreateFixedReturnOfferingMutation = createMutationHook<
  FixedReturnOfferingResponse,
  CreateFixedReturnOfferingParams
>({
  method: 'POST',
  endpoint: 'fixed-return-offering',
  invalidateKeys: (params) => [fixedReturnOfferingKeys.list(params.body.teamId)]
})
