import { computed, type ComputedRef, type WritableComputedRef } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'

export interface UsePaginationOptions {
  /**
   * Query-param prefix so several paginated tables can live on the same route
   * without colliding (e.g. `ledger` → `?ledgerPage=2&ledgerSize=20`). Omit for
   * the bare `page` / `pageSize` params on single-table routes.
   */
  key?: string
  /** Default page size when the URL carries none. Must be one of `pageSizeOptions`. */
  defaultPageSize?: number
  /** Allowed page sizes; an out-of-range `?…Size=` falls back to the default. */
  pageSizeOptions?: number[]
}

export interface UsePagination {
  /** Current 1-based page, mirrored to the route query (shareable, reload-safe). */
  page: WritableComputedRef<number>
  /** Current page size, mirrored to the route query. Setting it re-anchors `page`. */
  pageSize: WritableComputedRef<number>
  /** 1-based index of the first item on the current page (0 when `total` is 0). */
  rangeStart: ComputedRef<number>
  /** Reset back to page 1 — call when a filter changes the underlying list. */
  reset: () => void
}

/**
 * Shared pagination state bound to the route query, so a page link is shareable
 * and survives a reload. Page + page size are read from / written to the URL
 * (via `router.replace`, no history spam).
 *
 * Resize anchoring: when the page size changes, the item currently at
 * `rangeStart` stays in view — the new page is `ceil(rangeStart / newPageSize)`.
 * Example (total = 100): page 2 / size 10 (range 11–20) → size 5 lands on page 3
 * (range 11–15); size 20 lands on page 1 (range 1–20).
 *
 * `total` is passed as a getter so callers can clamp the displayed range without
 * the composable owning the data.
 */
export function usePagination(
  total: () => number,
  options: UsePaginationOptions = {}
): UsePagination {
  const { key = '', defaultPageSize = 20, pageSizeOptions = [10, 20, 50, 100] } = options
  const pageParam = key ? `${key}Page` : 'page'
  const sizeParam = key ? `${key}Size` : 'pageSize'

  const route = useRoute()
  const router = useRouter()

  /** Parse a positive integer from a (possibly array) query value. */
  function readInt(value: unknown, fallback: number): number {
    const raw = Array.isArray(value) ? value[0] : value
    const n = Number(raw)
    return Number.isInteger(n) && n > 0 ? n : fallback
  }

  /**
   * Mirror state to the URL via `router.replace` (no history spam). A param at
   * its default value is dropped rather than written, so a pristine table keeps
   * a clean, shareable URL.
   */
  function writeQuery(patch: Array<{ param: string; value: number; default: number }>): void {
    const patched = new Set(patch.map((entry) => entry.param))
    // Rebuild the query: keep params we're not touching, then re-add the patched
    // ones unless they sit at their default (those are dropped for a clean URL).
    const next: LocationQueryRaw = {}
    for (const [param, value] of Object.entries(route.query)) {
      if (!patched.has(param)) {
        next[param] = value
      }
    }
    for (const { param, value, default: fallback } of patch) {
      if (value !== fallback) {
        next[param] = String(value)
      }
    }
    void router.replace({ query: next })
  }

  const pageSize = computed<number>({
    get() {
      const value = readInt(route.query[sizeParam], defaultPageSize)
      return pageSizeOptions.includes(value) ? value : defaultPageSize
    },
    set(value: number) {
      // Resize anchoring: keep the current first item (rangeStart) on the page.
      const newPage = Math.max(1, Math.ceil(rangeStart.value / value))
      writeQuery([
        { param: sizeParam, value, default: defaultPageSize },
        { param: pageParam, value: newPage, default: 1 }
      ])
    }
  })

  const page = computed<number>({
    get: () => readInt(route.query[pageParam], 1),
    set: (value: number) =>
      writeQuery([{ param: pageParam, value: Math.max(1, value), default: 1 }])
  })

  const rangeStart = computed(() => (total() === 0 ? 0 : (page.value - 1) * pageSize.value + 1))

  function reset(): void {
    page.value = 1
  }

  return { page, pageSize, rangeStart, reset }
}
