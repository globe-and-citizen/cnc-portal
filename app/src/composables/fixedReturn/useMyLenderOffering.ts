import { computed, type Ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useFixedReturnMyLenderPositions } from './reads'
import { toLenderOffering } from '@/utils/communityCredit/offer'
import { UNCAPPED_ALLOCATION } from '@/utils/communityCredit/model'
import type { CreditLenderOffering, CreditRound, LendingOfferStruct } from '@/types'

/**
 * Derives the connected wallet's live position (whitelist allocation / cumulative
 * deposits) on one round from useFixedReturnMyLenderPositions, and exposes whether
 * that read is confirmed or failed. A failed read is surfaced explicitly rather than
 * folded into a fabricated zero position, which would be indistinguishable from a
 * confirmed "not on this round's whitelist" — see FixedReturnLenderPositionResult.
 */
export function useMyLenderOffering(
  round: Ref<CreditRound | null>,
  rawOffer: Ref<LendingOfferStruct | undefined>,
  decimals: Ref<number>
) {
  const queryClient = useQueryClient()
  const { data: myLenderPositions } = useFixedReturnMyLenderPositions()
  const myPosition = computed(() => myLenderPositions.value?.get(Number(round.value?.id ?? -1)))
  const positionUnavailable = computed(() => myPosition.value?.status === 'error')

  const lenderOffering = computed<CreditLenderOffering | null>(() => {
    if (!round.value || !rawOffer.value) return null
    const position =
      myPosition.value?.status === 'ok' ? myPosition.value : { allocation: 0n, deposited: 0n }
    const offering = toLenderOffering(
      Number(round.value.id),
      rawOffer.value,
      decimals.value,
      position.allocation,
      position.deposited
    )
    // toLenderOffering formatUnits-es the raw allocation as-is — for an uncapped
    // whitelist lender that's UNCAPPED_ALLOCATION (near-max uint256), which would
    // otherwise render as a nonsensical giant "cap" figure. Treat it like no cap.
    return position.allocation === UNCAPPED_ALLOCATION ? { ...offering, cap: null } : offering
  })

  function retryPosition() {
    return queryClient.refetchQueries({ queryKey: ['fixedReturnMyLenderPositions'] })
  }

  return { lenderOffering, positionUnavailable, retryPosition }
}
