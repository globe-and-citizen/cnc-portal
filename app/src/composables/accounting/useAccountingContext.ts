/**
 * Shared accounting context for the persistent Accounting route tree.
 *
 * `AccountingPage.vue` resolves the team's books once with {@link useCNCAccounting}
 * and `provide()`s the result to every nested report route. Consumers must remain
 * below that route boundary so a second journal cannot be created accidentally.
 */
import { inject, provide, type InjectionKey } from 'vue'
import { useCNCAccounting } from './useCNCAccounting'

type UseCNCAccountingReturn = ReturnType<typeof useCNCAccounting>

const ACCOUNTING_KEY: InjectionKey<UseCNCAccountingReturn> = Symbol('cnc-accounting')

/** Resolve the team's books and share them with the child cards. */
export function provideAccounting(
  teamId: Parameters<typeof useCNCAccounting>[0]
): UseCNCAccountingReturn {
  const accounting = useCNCAccounting(teamId)
  provide(ACCOUNTING_KEY, accounting)
  return accounting
}

/** Read the books owned by the Accounting route. */
export function useAccountingContext(): UseCNCAccountingReturn {
  const injected = inject(ACCOUNTING_KEY, null)
  if (!injected) {
    throw new Error('useAccountingContext must be used within the Accounting route')
  }
  return injected
}
