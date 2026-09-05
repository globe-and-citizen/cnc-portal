import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'

export interface FacetFilter<T> {
  /** The distinct facet values present in the incoming feed. */
  available: ComputedRef<string[]>
  /** True once there are at least two values to choose between. */
  show: ComputedRef<boolean>
  /** The user's selection — defaults to, and is reconciled against, `available`. */
  selected: Ref<string[]>
  /** The values to actually narrow by, or `null` when nothing is being narrowed. */
  active: ComputedRef<string[] | null>
  /** The feed narrowed to `active`, or the feed itself when nothing is narrowed. */
  result: ComputedRef<readonly T[]>
}

/**
 * A "narrow this feed by one of its own facets" filter — the account and currency
 * filters of the general ledger are both this shape: derive the options from the
 * data in view, show the selector only when there is a choice to make, keep the
 * selection valid as the feed changes, and narrow the feed by it.
 *
 * The selection follows the feed rather than fighting it: a full selection stays
 * full as new values stream in (the ledger loads incrementally, so a currency can
 * appear late and must not arrive unselected), a partial one keeps whatever is
 * still present, and an emptied one falls back to everything rather than leaving
 * a stale, empty view.
 */
export function useFacetFilter<T>(
  source: () => readonly T[],
  facetsOf: (entries: readonly T[]) => string[],
  narrow: (entries: readonly T[], facets: readonly string[]) => T[]
): FacetFilter<T> {
  const available = computed(() => facetsOf(source()))
  const show = computed(() => available.value.length >= 2)

  const selected = ref<string[]>([])
  watch(
    available,
    (avail, prev) => {
      const wasAll = !prev || selected.value.length >= prev.length
      if (wasAll) {
        selected.value = [...avail]
        return
      }
      const kept = selected.value.filter((value) => avail.includes(value))
      selected.value = kept.length ? kept : [...avail]
    },
    { immediate: true }
  )

  // Nothing to narrow by when the selector is hidden, or when everything is picked.
  const active = computed<string[] | null>(() => {
    if (!show.value) return null
    if (selected.value.length >= available.value.length) return null
    return selected.value
  })

  // Passed straight through when nothing is narrowed — no needless copy of a feed
  // that can run to thousands of postings.
  const result = computed<readonly T[]>(() =>
    active.value === null ? source() : narrow(source(), active.value)
  )

  return { available, show, selected, active, result }
}
