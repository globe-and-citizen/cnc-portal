/**
 * Shared accounting context for the Accounting view tree.
 *
 * The shared `AccountingPage.vue` shell resolves the team's books once with
 * {@link useCNCAccounting} and `provide()`s the result; the section cards it
 * wraps ({@link useAccountingContext}) `inject()` it instead of each re-fetching.
 * When a card is rendered standalone (a direct route hit, or a unit test), it
 * falls back to self-fetching from the route's `:id` param so it still works alone.
 */
import { inject, provide, type InjectionKey } from 'vue'
import { useRoute } from 'vue-router'
import { useCNCAccounting, type UseCNCAccountingReturn } from './useCNCAccounting'

const ACCOUNTING_KEY: InjectionKey<UseCNCAccountingReturn> = Symbol('cnc-accounting')

/** Resolve the team's books and share them with the child cards. */
export function provideAccounting(
  teamId: Parameters<typeof useCNCAccounting>[0]
): UseCNCAccountingReturn {
  const accounting = useCNCAccounting(teamId)
  provide(ACCOUNTING_KEY, accounting)
  return accounting
}

/** Read the shared books, or self-fetch from the route when rendered standalone. */
export function useAccountingContext(): UseCNCAccountingReturn {
  const injected = inject(ACCOUNTING_KEY, null)
  if (injected) return injected
  const route = useRoute()
  return useCNCAccounting(() => (route.params.id as string) ?? null)
}
