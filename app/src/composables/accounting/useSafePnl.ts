import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { JournalEntry } from '@/utils/accounting/types'
import { safeTreasuryPnl } from '@/utils/accounting/safePnl'
import { useGetSafeBalancesQuery } from '@/queries/safeClient.queries'

/** Safe and Accounting share USD Gateway evidence and the same journal projection. */
export function useSafePnl(
  journal: MaybeRefOrGetter<readonly JournalEntry[]>,
  ready: MaybeRefOrGetter<boolean>,
  address: MaybeRefOrGetter<string | undefined>
) {
  const query = useGetSafeBalancesQuery({ pathParams: { safeAddress: address, fiatCode: 'USD' } })
  return {
    ...query,
    data: computed(() =>
      safeTreasuryPnl(
        toValue(journal),
        query.error.value ? undefined : query.data.value,
        toValue(ready)
      )
    )
  }
}
