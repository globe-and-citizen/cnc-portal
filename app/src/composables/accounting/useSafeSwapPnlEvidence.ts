import { computed, type Ref } from 'vue'
import { useSafeSwapPnl } from '@/composables/safe/useSafeSwapPnl'

/**
 * The Safe overview's P&L of each swap of the default Safe, which the books post to Swap P&L,
 * with the availability reports wait for.
 */
export function useSafeSwapPnlEvidence(safeAddress: Ref<string | undefined>) {
  const swapPnl = useSafeSwapPnl(safeAddress)

  /** A swap P&L priced without some asset is incomplete, as the Safe overview says. */
  const partialReason = (): string | undefined => {
    const missing = swapPnl.data.value?.missingPrices ?? []
    return missing.length ? `Swap P&L has no USD price for ${missing.join(', ')}.` : undefined
  }

  return {
    swaps: computed(() => swapPnl.data.value?.swaps ?? []),
    availability: { isLoading: swapPnl.isLoading, error: swapPnl.isError },
    partialReason
  }
}
