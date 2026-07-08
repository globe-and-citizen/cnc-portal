import { useLocalStorage } from '@vueuse/core'
import { isAddress } from 'viem'
import { computed } from 'vue'

/**
 * Per-tab Polymarket wallet address.
 *
 * The address lives in the URL query (`?address=0x…`) so two tabs in the same
 * browser can analyze two different wallets at once — each tab keeps its own
 * `?address=` while the shared `localStorage` only acts as a first-visit
 * default. TanStack Query keys already include the address, so cross-tab
 * cache pollution is impossible.
 *
 * Precedence: route query > localStorage default. The setter writes to both,
 * but only if the new value is a valid checksum-able address; an invalid
 * value (e.g. half-typed) keeps the input warm via localStorage without
 * poisoning the URL.
 */
export function useWalletAddress() {
  const route = useRoute()
  const router = useRouter()

  const lsDefault = useLocalStorage<string>('dashboard-polymarket-user-address', '')
  const routeAddress = computed(() => String(route.query.address ?? '').trim())

  const address = computed(() => routeAddress.value || lsDefault.value)

  /**
   * Sets the active address. Writes to localStorage immediately so the input
   * stays in sync as the user types; only commits to the URL once the value
   * passes `viem.isAddress` so refresh-on-broken-URL never happens.
   */
  function set(raw: string): void {
    const trimmed = (raw ?? '').trim()
    lsDefault.value = trimmed

    if (trimmed === '') {
      if (route.query.address !== undefined) {
        const { address: _drop, ...rest } = route.query
        void router.replace({ query: rest })
      }
      return
    }
    if (!isAddress(trimmed as `0x${string}`)) {
      // Don't poison the URL with half-typed input — wait for a valid address.
      return
    }
    if (route.query.address !== trimmed) {
      void router.replace({ query: { ...route.query, address: trimmed } })
    }
  }

  return { address, set, routeAddress, lsDefault }
}
