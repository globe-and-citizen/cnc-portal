import { computed, type Ref } from 'vue'
import { useSafeSwapPnl } from '@/composables/safe/useSafeSwapPnl'

/**
 * The Safe overview's average-cost P&L of each swap of the default Safe, which the books post to
 * Swap P&L, with the availability reports wait for.
 */
export function useSafeSwapPnlEvidence(safeAddress: Ref<string | undefined>) {
  const swapPnl = useSafeSwapPnl(safeAddress)

  /** A token the Safe overview cannot value leaves its P&L incomplete, as the overview says. */
  const partialReason = (): string | undefined => {
    const unvalued = swapPnl.costBasis.value?.unvaluedTokens ?? []
    return unvalued.length ? `Swap P&L has no USD price for ${unvalued.join(', ')}.` : undefined
  }

  return {
    swaps: computed(() => swapPnl.costBasis.value?.swaps ?? []),
    availability: { isLoading: swapPnl.isLoading, error: swapPnl.isError },
    partialReason
  }
}
